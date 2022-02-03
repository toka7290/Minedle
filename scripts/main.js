import * as GameTest from "mojang-gametest";
import { BlockLocation, BlockProperties, MinecraftBlockTypes, world } from "mojang-minecraft";
import { ActionFormData, FormResponse, ModalFormData } from "mojang-minecraft-ui";
import { WORDS } from "./lib/dat.js";

const MAX_ATTEMPT = 6;

let concrete_gray = MinecraftBlockTypes.concrete.createDefaultBlockPermutation();
concrete_gray.getProperty(BlockProperties.color).value = "gray";
let concrete_lime = MinecraftBlockTypes.concrete.createDefaultBlockPermutation();
concrete_lime.getProperty(BlockProperties.color).value = "lime";
let concrete_yellow = MinecraftBlockTypes.concrete.createDefaultBlockPermutation();
concrete_yellow.getProperty(BlockProperties.color).value = "yellow";

let play_count = 0;
let won = 0;
let current_streak = 0;
let max_streak = 1;
// 入力した単語の記録
let board_state = new Array();
// 入力単語の評価
let evaluations = {
  status: [],
  shred: [],
  square: [],
};
// 試行回数
let row_index = 0;
// 答え
let answer = "";
GameTest.registerAsync("Minedle", "game", async (test) => {
  let player = [...world.getPlayers()][0];

  if (answer == "") {
    play_count++;
    answer = WORDS[Math.round(Math.random() * WORDS.length)];
    row_index = 0;
  } else {
    for (let row = 0; row < row_index; row++) {
      for (let a = 0; a < 5; a++) {
        let loc = new BlockLocation(a, 1, row);
        test.setBlockType(MinecraftBlockTypes.concrete, loc);
        if (evaluations.shred[row][a] == 2) {
          test.setBlockPermutation(concrete_lime, loc);
        } else if (evaluations.shred[row][a] == 1) {
          test.setBlockPermutation(concrete_yellow, loc);
        } else {
          test.setBlockPermutation(concrete_gray, loc);
        }
      }
    }
  }

  // debug
  answer = "paint";
  // 文字単位の配列
  let answer_arr = answer.split("");

  while (row_index < MAX_ATTEMPT) {
    // 最後に入力した単語
    let recent_val = "";
    // 入力画面
    let input_screen = new ModalFormData();
    // 入力画面のタイトル
    input_screen.title("Minedle");

    if (evaluations.status.length)
      input_screen.dropdown("History", evaluations.status, evaluations.status.length - 1);
    input_screen.textField("word", "");

    await input_screen
      .show(player)
      .then(async (res) => {
        if (res.isCanceled) {
          test.print("Interrupted data will be recorded until the session is disconnected.");
          test.succeed();
          return;
        }
        recent_val = res.formValues[res.formValues.length - 1].toLowerCase();
        // 単語かどうか
        if (WORDS.includes(recent_val)) {
          // 評価を記録
          let evaluation = [];
          let evaluation_shred = [];
          let evaluation_square = [];
          recent_val.split("").forEach((v, i) => {
            let loc = new BlockLocation(i, 1, row_index);
            test.setBlockType(MinecraftBlockTypes.concrete, loc);
            if (answer_arr[i] == v) {
              // 一致
              evaluation.push(`§a${v}§r`);
              evaluation_shred.push(2);
              evaluation_square.push(`§a■§r`);
              test.setBlockPermutation(concrete_lime, loc);
            } else if (answer_arr.includes(v)) {
              // 含まれる
              evaluation.push(`§6${v}§r`);
              evaluation_shred.push(1);
              evaluation_square.push(`§6■§r`);
              test.setBlockPermutation(concrete_yellow, loc);
            } else {
              evaluation.push(`§r${v}§r`);
              evaluation_shred.push(0);
              evaluation_square.push(`§r■§r`);
              test.setBlockPermutation(concrete_gray, loc);
            }
          });
          evaluations.status.push(evaluation.join());
          evaluations.shred.push(evaluation_shred);
          evaluations.square.push(evaluation_square.join(""));
          board_state.push(recent_val);
          row_index++;
        } else {
          // 単語ではない
          let correct_screen = new ActionFormData();
          correct_screen.title("Error!");
          correct_screen.body(`Not in word list`);
          correct_screen.button("OK");
          await correct_screen.show(player);
        }
      })
      .catch((e) => {
        test.print("Interrupted data will be recorded until the session is disconnected.");
        test.succeed();
      });
    if (recent_val == "") break;

    // 正解の場合
    if (answer == recent_val) {
      won++;
      current_streak++;
      if (max_streak > current_streak) {
        max_streak = current_streak;
      }
      let correct_screen = new ActionFormData();
      correct_screen.title("Congratulations!");
      correct_screen.body(
        `STATISTICS \n${play_count} Played\n${Math.round(
          (won / play_count) * 100
        )} Win \%\n${current_streak}Current Streak\n${max_streak}Max Streak\nThe correct answer was "${answer}"\n${evaluations.square.join(
          "\n"
        )}`
      );
      correct_screen.button("Exit");
      // リセット
      answer = "";
      row_index = 0;
      evaluations = {
        status: [],
        shred: [],
        square: [],
      };
      correct_screen.show(player);
      test.succeed();
      return;
    }
  }
  // 負けた場合
  if (row_index >= MAX_ATTEMPT) {
    current_streak = 0;
    let statistics_screen = new ActionFormData();
    statistics_screen.title("");
    statistics_screen.body(
      `STATISTICS \n${play_count} Played\n${Math.round(
        (won / play_count) * 100
      )} Win \%\n${current_streak}Current Streak\n${max_streak}Max Streak\nThe correct answer was "${answer}"\n${evaluations.square.join(
        "\n"
      )}`
    );
    statistics_screen.button("Exit");
    statistics_screen.show(player);
  }

  test.succeed();
})
  .maxTicks(20 * 60 * 60)
  .structureName("Toka7290:Minedle");
