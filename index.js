const core = require("@actions/core");
const axios = require("axios");
const Humanize = require("humanize-plus");
const fs = require("fs");
const exec = require("./exec");

const TODOIST_API_KEY = core.getInput("TODOIST_API_KEY") || process.env.TODOIST_API_KEY;
const PREMIUM = core.getInput("PREMIUM");

async function main() {
  // v8 => v9
  const stats = await axios(
    "https://api.todoist.com/sync/v9/completed/get_stats",
    { headers: { Authorization: `Bearer ${TODOIST_API_KEY}` } }
  );
  await updateReadme(stats.data);
}

let todoist = [];
let jobFailFlag = false;
const README_FILE_PATH = "./README.md";

async function updateReadme(data) {
  const { karma, completed_count, days_items, goals, week_items } = data;

  const karmaPoint = [`🏆  **${Humanize.intComma(karma)}** Karma Points`];
  todoist.push(karmaPoint);

  const dailyGoal = [
    `🌸  Completed **${days_items[0].total_completed.toString()}** tasks today`,
  ];
  todoist.push(dailyGoal);

  if (PREMIUM == "true") {
    const weekItems = [
      `🗓  Completed **${week_items[0].total_completed.toString()}** tasks this week`,
    ];
    todoist.push(weekItems);
  }

  const totalTasks = [
    `✅  Completed **${Humanize.intComma(completed_count)}** tasks so far`,
  ];
  todoist.push(totalTasks);

  const longestStreak = [
    `⏳  Longest streak is **${goals.max_daily_streak.count}** days`,
  ];
  // todoist.push(longestStreak);

  if (todoist.length == 0) return;

  if (todoist.length > 0) {
    // console.log(todoist.length);
    // const showTasks = todoist.reduce((todo, cur, index) => {
    //   return todo + `\n${cur}        ` + (((index + 1) === todoist.length) ? '\n' : '');
    // })
    const readmeData = fs.readFileSync(README_FILE_PATH, "utf8");

    const newReadme = buildReadme(readmeData, todoist.join("           \n"));
    if (newReadme !== readmeData) {
      core.info("Writing to " + README_FILE_PATH);
      fs.writeFileSync(README_FILE_PATH, newReadme);

      // if (!process.env.TEST_MODE) {
      //   commitReadme();
      // }

      core.info("README.md updated 👔 Successfully");

      // GitHub Action git push 

    } else {
      core.info("No change detected, skipping");
      process.exit(0);
    }
  } else {
    core.info("Nothing fetched");
    process.exit(jobFailFlag ? 1 : 0);
  }
}

console.log(todoist.length);

const buildReadme = (prevReadmeContent, newReadmeContent) => {
  const tagToLookFor = "<!-- TODO-IST:";
  const closingTag = "-->";
  const startOfOpeningTagIndex = prevReadmeContent.indexOf(
    `${tagToLookFor}START`
  );
  const endOfOpeningTagIndex = prevReadmeContent.indexOf(
    closingTag,
    startOfOpeningTagIndex
  );
  const startOfClosingTagIndex = prevReadmeContent.indexOf(
    `${tagToLookFor}END`,
    endOfOpeningTagIndex
  );
  if (
    startOfOpeningTagIndex === -1 ||
    endOfOpeningTagIndex === -1 ||
    startOfClosingTagIndex === -1
  ) {
    core.error(
      `Cannot find the comment tag on the readme:\n<!-- ${tagToLookFor}:START -->\n<!-- ${tagToLookFor}:END -->`
    );
    process.exit(1);
  }
  return [
    prevReadmeContent.slice(0, endOfOpeningTagIndex + closingTag.length),
    "\n",
    newReadmeContent,
    "\n",
    prevReadmeContent.slice(startOfClosingTagIndex),
  ].join("");
};

const commitReadme = async () => {
  // Getting config
  const gitConfig = {
    email: core.getInput("GIT_EMAIL") || process.env.GIT_EMAIL,
    username: core.getInput("GIT_USERNAME") || process.env.GIT_USERNAME,
    rebase: core.getInput("REBASE") || process.env.REBASE,
    branch: core.getInput("BRANCH") || process.env.BRANCH,
    commit_message:
      core.getInput("COMMIT_MESSAGE") || process.env.COMMIT_MESSAGE,

    // For testing
    test_mode: process.env.TEST_MODE,

    // For debugging
    debug: core.getInput("DEBUG") || process.env.DEBUG,

  };

  // Setting up git
  await exec("git config --global user.email", gitConfig.email);

  await exec("git config --global user.name", gitConfig.username);

  // Fetching the latest changes
  await exec("git fetch");

  // Checking out to the branch
  await exec("git checkout", gitConfig.branch);

  // Rebasing
  if (gitConfig.rebase === "true") {
    await exec("git rebase origin", gitConfig.branch);
  }

  // Committing the changes
  await exec("git add .");

  await exec("git commit -m", gitConfig.commit_message);

  // Pushing the changes
  await exec("git push origin", gitConfig.branch);

  core.info("Changes committed to the branch");

  // Checking if the commit was successful
  const gitLog = await exec("git log -1 --pretty=%B");

  if (gitLog.includes(gitConfig.commit_message)) {
    core.info("Commit successful");
  }


};

(async () => {
  await main();
})();
