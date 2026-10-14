// ---------------------------------------------------------------------------
// Records submenu and its interactive workflows. This is the ONLY file in the
// module that prompts or prints. Every decision about data lives in the
// sibling files, which are tested without a terminal.
// ---------------------------------------------------------------------------

import { askChoice, askYesNo } from "../../cli/prompt.js";
import { reportError } from "../../cli/output.js";
import { formatTable } from "../../cli/tables.js";
import { formatDate, formatTags, formatValue } from "../../lib/format.js";
import { nextId } from "../../lib/ids.js";
import { createRecord } from "./create.js";
import {
  SORT_FIELDS,
  filterRecords,
  getRecordById,
  listRecords,
  searchRecords,
} from "./read.js";
import { updateRecord } from "./update.js";
import { deleteRecord } from "./delete.js";
import {
  buildChanges,
  buildRecordInput,
  parseOptionalValueText,
} from "./input.js";

// Table layout, declared once and reused by list, search and filter.
const RECORD_COLUMNS = [
  { header: "ID", value: (r) => r.id },
  { header: "Name", value: (r) => r.name, maxWidth: 24 },
  { header: "Category", value: (r) => r.category, maxWidth: 16 },
  { header: "Value", value: (r) => formatValue(r.value), align: "right" },
  { header: "Tags", value: (r) => formatTags(r.tags), maxWidth: 24 },
  { header: "Created", value: (r) => formatDate(r.createdAt) },
];

function showRecords(out, records) {
  if (records.length === 0) {
    out.line("No records found."); // useful empty state instead of an empty table
    return;
  }
  out.line(formatTable(RECORD_COLUMNS, records));
  out.line(`${records.length} record(s)`);
}

function showRecordDetails(out, record) {
  out.line(`ID:       ${record.id}`);
  out.line(`Name:     ${record.name}`);
  out.line(`Category: ${record.category}`);
  out.line(`Value:    ${formatValue(record.value)}`);
  out.line(`Tags:     ${formatTags(record.tags)}`);
  out.line(`Created:  ${record.createdAt}`);
}

// Each workflow receives the shared context: { store, prompt, out }.

async function createWorkflow({ store, prompt, out }) {
  const suggested = nextId(store.list().map((record) => record.id));
  const idText = (await prompt.ask(`ID (Enter for ${suggested}): `)).trim();
  const name = await prompt.ask("Name: ");
  const category = await prompt.ask("Category: ");
  const valueText = await prompt.ask("Value: ");
  const tagsText = await prompt.ask("Tags (comma-separated, optional): ");

  const record = createRecord(
    store,
    buildRecordInput({
      id: idText === "" ? suggested : idText,
      name,
      category,
      valueText,
      tagsText,
    }),
  );
  out.success(`Created record ${record.id}.`);
}

async function listWorkflow({ store, prompt, out }) {
  const raw = (
    await prompt.ask(`Sort by (${SORT_FIELDS.join("/")}, Enter for none): `)
  ).trim();

  let options = {};
  if (raw !== "") {
    // Accept any capitalization of a field name; unknown text is passed on so
    // listRecords reports it with the list of valid fields.
    const sortBy =
      SORT_FIELDS.find((field) => field.toLowerCase() === raw.toLowerCase()) ??
      raw;
    const direction = (
      await prompt.ask("Direction (asc/desc, Enter for asc): ")
    )
      .trim()
      .toLowerCase();
    options = { sortBy, direction: direction === "" ? "asc" : direction };
  }
  showRecords(out, listRecords(store, options));
}

async function viewWorkflow({ store, prompt, out }) {
  const id = (await prompt.ask("Record ID: ")).trim();
  showRecordDetails(out, getRecordById(store, id));
}

async function updateWorkflow({ store, prompt, out }) {
  const id = (await prompt.ask("Record ID to update: ")).trim();
  showRecordDetails(out, getRecordById(store, id)); // fails early if the id is unknown

  out.line("Press Enter to keep a value. For tags, type - to clear them.");
  const name = await prompt.ask("New name: ");
  const category = await prompt.ask("New category: ");
  const valueText = await prompt.ask("New value: ");
  const tagsText = await prompt.ask("New tags (comma-separated): ");

  const changes = buildChanges({ name, category, valueText, tagsText });
  if (Object.keys(changes).length === 0) {
    out.warn("Nothing to change.");
    return;
  }
  updateRecord(store, id, changes);
  out.success(`Updated record ${id}.`);
}

async function deleteWorkflow({ store, prompt, out }) {
  const id = (await prompt.ask("Record ID to delete: ")).trim();
  showRecordDetails(out, getRecordById(store, id));

  if (await askYesNo(prompt, out, "Delete this record?")) {
    deleteRecord(store, id);
    out.success(`Deleted record ${id}.`);
  } else {
    out.line("Cancelled. Nothing was deleted.");
  }
}

async function searchWorkflow({ store, prompt, out }) {
  const query = await prompt.ask("Search name or tag: ");
  showRecords(out, searchRecords(store, query));
}

async function filterWorkflow({ store, prompt, out }) {
  out.line("Press Enter to skip a criterion.");
  const category = (await prompt.ask("Category: ")).trim();
  const min = await prompt.ask("Minimum value: ");
  const max = await prompt.ask("Maximum value: ");

  showRecords(
    out,
    filterRecords(store, {
      category: category === "" ? undefined : category,
      minValue: parseOptionalValueText(min),
      maxValue: parseOptionalValueText(max),
    }),
  );
}

const ACTIONS = Object.freeze([
  { key: "1", label: "Create a record", run: createWorkflow },
  { key: "2", label: "List records", run: listWorkflow },
  { key: "3", label: "View a record", run: viewWorkflow },
  { key: "4", label: "Update a record", run: updateWorkflow },
  { key: "5", label: "Delete a record", run: deleteWorkflow },
  { key: "6", label: "Search by name or tag", run: searchWorkflow },
  { key: "7", label: "Filter by category or value", run: filterWorkflow },
]);

/** Runs the records submenu until the user goes back. */
export async function runRecordsMenu(context) {
  const { prompt, out } = context;
  const allowed = [...ACTIONS.map((action) => action.key), "0"];

  while (true) {
    out.blank();
    out.heading("Manage records");
    for (const action of ACTIONS) out.line(`${action.key}. ${action.label}`);
    out.line("0. Back");
    out.blank();

    const key = await askChoice(prompt, out, "Select an option: ", allowed);
    if (key === "0") return;

    try {
      await ACTIONS.find((action) => action.key === key).run(context);
    } catch (error) {
      // Expected errors are shown and the user stays in this submenu.
      // Anything else (bugs, closed input) is passed up to the main menu.
      if (!reportError(out, error)) throw error;
    }
  }
}
