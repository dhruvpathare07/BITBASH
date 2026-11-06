// GENERATED from the MQ1..MQ10 maze images by maze_convert.py. Do not edit by hand.
//
// Round 2 mazes: challenge 1 uses MQ1, challenge 2 uses MQ2, and so on.
// The game draws each maze image (src/assets/mazes, walls only, tinted in
// the game) and moves the player on the walls read from that same image.
// Each maze is one connected 30 x 15 grid: the player starts top-left and
// four gates in the outer wall are the exits A-D, all reachable.

import mq1 from "../assets/mazes/mq1.png";
import mq2 from "../assets/mazes/mq2.png";
import mq3 from "../assets/mazes/mq3.png";
import mq4 from "../assets/mazes/mq4.png";
import mq5 from "../assets/mazes/mq5.png";
import mq6 from "../assets/mazes/mq6.png";
import mq7 from "../assets/mazes/mq7.png";
import mq8 from "../assets/mazes/mq8.png";
import mq9 from "../assets/mazes/mq9.png";
import mq10 from "../assets/mazes/mq10.png";

export const MAZE_COLS = 30;
export const MAZE_ROWS = 15;

// Where the grid sits inside each image (pixels): line k is at
// x0 + k * cellW and y0 + k * cellH.
const IMAGE = { width: 2048, height: 884, x0: 0.0, y0: 5.000, cellW: 68.2667, cellH: 58.1667 };

const START = { x: 0, y: 0 };
const EXITS = { A: { x: 20, y: 0, side: "top" }, B: { x: 29, y: 4, side: "right" }, C: { x: 14, y: 14, side: "bottom" }, D: { x: 29, y: 14, side: "bottom" } };

const WALL_BITS = { top: 1, right: 2, bottom: 4, left: 8 };

function decode(rows) {
  return rows.map((row) =>
    [...row].map((hex) => {
      const v = parseInt(hex, 16);
      return {
        top: Boolean(v & WALL_BITS.top),
        right: Boolean(v & WALL_BITS.right),
        bottom: Boolean(v & WALL_BITS.bottom),
        left: Boolean(v & WALL_BITS.left),
      };
    })
  );
}

const SOURCES = [
  { id: "MQ1", image: mq1, rows: ["955115139513913911550395555153", "ad3ac568456c46aaac13aac39396ba", "c52c553c55153968696aac3aac6b86", "954557c393aba852929683aaa9546b", "839139386ac2ac3846816c46a85550", "aaac42ac3c3c296c156a95156c153a", "aac396c3c5296a95697ac3a953c3aa", "86ba853a95683ac3d45456ec3c3ec6", "c16ac3c46916c41693953917c3c553", "969696953ac393c12aabc6c13a953a", "8383c3abac56a856ac685396ac692a", "ac683aaac5156a95413a96ab8556ea", "a95686c43969544796c0696869553a", "8453c5516c547953a91696d454396a", "c5545554555554146c47c555556c52"] },
  { id: "MQ2", image: mq2, rows: ["979153915793915553912955515153", "c56c3aac396c6a957c6aa8393c783a", "91556aa946b95685555446c6a956c6", "ac1156a8392a916953939553ac5553", "83ac53c6aaaac4543c6ac53c693938", "ac693c53aaea9393a952954556aac6", "a952c13aac3c6c6ac43c293d53ac53", "aa969286c3855152d3c3aac53ac552", "c6856ac556c392d4543a86956c1152", "916912911552ae95516c6ba9156a92", "8696ac2ac53ac3ad3c555446a956aa", "a945696c53c07ac3a93955116a956a", "aad13c55169692bac2c6956a92a916", "ac38053969296c6c3a93a956c6ac43", "c56c454456ec55156c6c6c55554552"] },
  { id: "MQ3", image: mq3, rows: ["955395395151551555552d55511513", "c53c696c3c3e95695553a9553aa96a", "9381505543a929543956c4552ac452", "aac43c55546ac2952a9555556c553e", "ac556939553c3ea96aa955391553c1", "a95556ac3bc3c50692ac1386a95692", "86d53943c2bc53a96c43ac43aa956a", "85396c529285546c5396a9546c6956", "a96c393c6a8513939283e839515453", "ac396a8556ab82ac6c6c3eac3c1552", "a96c3ac393c2aac3953969292bc552", "82916a946a96a8386bc692aac4113a", "ac6c54453c696aac505386a8556aaa", "85555539455692a93a96a9069552aa", "c555554455556c06c6c546c5457c42"] },
  { id: "MQ4", image: mq4, rows: ["915551391391515393938555113953", "ac151686ac2c383c46ac2953ac4692", "a943c7a969296ac55543c43869396a", "a83c556c52ac54555138396c16ac3a", "c6ab93913ac5395556ac2855692968", "93ac6c6c2c3bc69393c3aa9396ac16", "aa839555296c116eac56c46c696bc3", "aaaac3956c53ac51693951393c52ba", "a86c56c39556a93c56c43ac6c1546a", "ae939556c15542c555392c793c5512", "a92aa9393c793c39556aa956c5556a", "86ac6c2ac53ac3a85156c693955156", "a945556c13c696a83851396c693c53", "a8391553ec39692c28386a913ac392", "c6c6c554556c56856c6c546c445442"] },
  { id: "MQ5", image: mq5, rows: ["93953951155113b913b94553915513", "aaa9443ac556aac6aaaad13c6a97c2", "86a853ae95556a956a8696a956c152", "856a96a96d157aa93ac56baa953a96", "8556a96c538556c2ac1392ac6bac41", "ab952ad13aa9553aa96aaac552c53a", "82c16c56aaac396aac3aac555457ae", "aabc5153c6c56c38692ac539555383", "aa853ad4393d13c6906c53c29396aa", "82a96c1546c56c57aa953c3aaac386", "ac6c13c395553953ac6b87aa8296c3", "c3956abc6953ac3c693ac3c6c2a952", "94293c2952d407c55682b85552c692", "856a87aad693c115556c2c53d4792a", "c556c56c556c5685555545545556c2"] },
  { id: "MQ6", image: mq6, rows: ["955395555393955555550539551153", "8556ad3956ac695515156d2c552c3a", "c539456839453c53c56953c5396bc2", "956ab93ac295453853943a9546b856", "a916aac296ad152a94692869392a91", "aac12c16ad4383ac0552ec16aac6aa", "a816c3c56952ec43c39293a96c556a", "86c39439505693ba942eaac439397a", "a93a83aa9693aaaac3a96c556ac296", "aac46aae83ac6aac3c2a9179543a83", "869396c3ec69568543aaaa96b96ac2", "c56c6d3c553a938396aaec43ac5456", "95139105796aac6c6d68513a853d13", "a96eaae93c3aa913953c7aac6ba92a", "c4556c56c546c6846d4556c55446c2"] },
  { id: "MQ7", image: mq7, rows: ["b9551553d553955555550553955553", "ac53ad545156c53b95396b9683953a", "83bac553969393aac3ac3c456843aa", "ac2a953a83ac6aac56c3c5393a946a", "c3aaa96aac693c695550552eaaa978", "96c2aa96a956c15695529543ac2856", "a91682a96c553a93c556c53aa96c53", "aaa96ac693d52c6a9395396c2853ba", "aa8690392a93c5386a83aa956c3aaa", "86c3ac46c2a8552a906ac6a9516a86", "c552c5553c6a93c46e9693ac547a83", "913c5393a93eaa9553c56ac55556c2", "aa857c6c2aa96aad5455543915517a", "aae91557aac69469395393eaa91692", "c456c5556c554516c47c6c56c6c542"] },
  { id: "MQ8", image: mq8, rows: ["955555155793951393d12951391553", "ad395569556aa92c6856eabaaac53e", "c56a9556953c2aa93e9554686857c3", "9156ab956bc3eaeaa96d139696953a", "aa93aac3943c3a96aa916ec3c3c380", "aaaac43ac3c7c2abc46a953c543ac6", "aeaa956c3c5556ac39386bc5396c53", "c3aac553c55555456aea9293ac3b96", "96a87956951553939696aaac6946c3", "83aa9693abad3aac69696aab969556", "aaaac3ac46a96ac53c383c68696d53", "ac6c56c7956c543bc56a8152969552", "c555555385553ba8553aec56c383d2", "b915113ac793aaac57ac555556ec3a", "c6c546c4556c6c055545555555556a"] },
  { id: "MQ9", image: mq9, rows: ["93d513d555155551395543b9515553", "ac156c5393e9393eac539686bc553e", "ad69553c6c3aaac54796c3c54397c3", "a95693a93d46aa9553c3bad396c17a", "aa916ec6c3b96c2b947aac3c439690", "86c451553ac453c6c396c3c3d4696e", "c55556b96c53bc553aa9547c553853", "9393956c3b96a917c2ac3955396c3a", "ac6c2953aaad46a916c3c453ac53ea", "c3b96c3c6aa953aaa93a93d6c17c3a", "968697a912c6baaaaac6ac3952956a", "83c3c3aaac552a86aa93c3c6bc43d2", "ac3a96c681796ac16c6c56d1293a92", "83c469556c56bc3e95395156c6ec6a", "ec5554555555478547c47c55555552"] },
  { id: "MQ10", image: mq10, rows: ["939157955555539513d14553d15553", "aeaa956955553c696c38553c56d556", "83aac3ba9397c396b96c7929555393", "ac6c56aaaaa93a83ac553aa8557c6a", "a955156c6ac2c6ea8553aaea955550", "ae956913bc3c3956c17c4696c1553a", "c38556ac07c3c6b95695552d3c53aa", "9685796d29569546954793c7c396aa", "c3a93a93ea93879547956a9556abaa", "96eac2ac3aac696d396d3ac39546aa", "c53c3ec3aac796916c53ac56c393ae", "d3c52956ac53a96c153c2953d6aac3", "9693ac3d4516ae956babc6bc556c56", "a96aa96953e96969786853853d5513", "c47c6c547c5456945456d46d45556a"] },
];

export const LOGIC_MAZE_MAPS = SOURCES.map(({ id, image, rows }) => ({
  id,
  cols: MAZE_COLS,
  rows: MAZE_ROWS,
  cells: decode(rows),
  start: START,
  exits: EXITS,
  image: { src: image, ...IMAGE },
}));

const STEPS = [
  { dx: 0, dy: -1, wall: "top" },
  { dx: 1, dy: 0, wall: "right" },
  { dx: 0, dy: 1, wall: "bottom" },
  { dx: -1, dy: 0, wall: "left" },
];

// Every exit must be reachable from the start (checked when the file is
// generated; kept here as a check in case the data is ever edited).
export function validateMazeMap(maze) {
  const seen = new Set([`${maze.start.x},${maze.start.y}`]);
  const queue = [maze.start];
  for (let i = 0; i < queue.length; i += 1) {
    const { x, y } = queue[i];
    for (const s of STEPS) {
      const nx = x + s.dx;
      const ny = y + s.dy;
      const key = `${nx},${ny}`;
      if (
        !maze.cells[y][x][s.wall] &&
        nx >= 0 && nx < maze.cols && ny >= 0 && ny < maze.rows &&
        !seen.has(key)
      ) {
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return Object.values(maze.exits).every((e) => seen.has(`${e.x},${e.y}`));
}
