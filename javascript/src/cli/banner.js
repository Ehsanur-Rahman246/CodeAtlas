const RESET = "\x1b[0m";
const YELLOW = "\x1b[33;1m";
const WHITE = "\x1b[97m";
const GRAY = "\x1b[90m";
const BLACK = "\x1b[30;1m";
const BG_YELLOW = "\x1b[43m";

const art = String.raw`
   █████\  ██████\  
   \__██ |██  __██\ 
      ██ |██ /  \__|
      ██ |\██████\  
██\   ██ | \____██\ 
██ |  ██ |██\   ██ |
\██████  |\██████  |
 \______/  \______/ 
`;

const banner = `${YELLOW}${art}${RESET}`;

export function showBanner() {
  console.log(banner);
  console.log(
    `  ${BG_YELLOW}${BLACK} JS ${RESET} ${WHITE}CodeAtlas${RESET} ${GRAY}/ JavaScript Edition${RESET}`,
  );
  console.log(`  ${YELLOW}Explore languages. Discover possibilities.${RESET}`);
  console.log(`  ${GRAY}Mini Data Lab · v1.0.0${RESET}\n`);
}
