import { join } from "node:path";
import { getBanner } from "./cli/banner.js";
import { color, print, printError } from "./cli/output.js";
import { ask, closePrompt } from "./cli/prompt.js";
import { MAIN_MENU, renderMenu, parseChoice } from "./menu.js";
import { loadTopicFile, TOPICS_DIR } from "./guide/catalog.js";

// Runs the main loop until the user exits or input ends.
export async function run() {
  print(getBanner({ color }));

  try {
    while (true) {
      print();
      print(renderMenu(MAIN_MENU));
      const input = await ask("> ");

      // null means input ended (Ctrl+D / Ctrl+C), so leave the loop.
      if (input === null) break;

      // Blank input: just show the menu again.
      if (input === "") continue;

      const choice = parseChoice(input, MAIN_MENU);

      // Anything that isn't a listed key is an invalid choice.
      if (choice === null) {
        printError(
          `Invalid choice: "${input}". Type one of the listed numbers.`,
        );
        continue;
      }

      if (choice.id === "exit") break;

      // Temporary: load one topic file and list its titles to prove loading works.
      if (choice.id === "guide") {
        try {
          const topics = await loadTopicFile(
            join(TOPICS_DIR, "fundamentals.json"),
          );
          print(`Loaded ${topics.length} topics:`);
          for (const topic of topics) {
            print(`  - ${topic.title}`);
          }
        } catch (error) {
          // A load failure should explain itself, not crash the app.
          printError(error.message);
        }
      }
    }
  } finally {
    // Always release the terminal, even if something above throws.
    print("\nGoodbye!");
    closePrompt();
  }
}
