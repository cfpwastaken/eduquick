#!/usr/bin/env node
import { Edupage } from "edupage-api";
import { readFileSync } from "node:fs";
import ora from "ora";
import chalk from "chalk";

function termArg(arg, short, def) {
  let index = process.argv.indexOf("--" + arg);
  if(index === -1) index = process.argv.indexOf("-" + short);
  if(index === -1) return def;
  return process.argv[index + 1];
}

// Very N A M I N G
// Value not required                value if not given
function termArgVNR(arg, short, def, ving) {
  let index = process.argv.indexOf("--" + arg);
  if(index === -1) index = process.argv.indexOf("-" + short);
  if(index === -1) return def;
  const nextArg = process.argv[index + 1];
  if(nextArg == undefined) return ving;
  if(nextArg.startsWith("-")) return ving;
  return process.argv[index + 1];
}

if(termArgVNR("help", "h", false, true)) {
  console.log(`${chalk.bold.green("EduQuick")} v${chalk.bold.yellow("1.2.0")} - Quickly get information about your school day.`);
  console.log(`${chalk.italic.green("Usage")}: ${chalk.bold.yellow("edupage-quick")} [options]`);
  console.log(`${chalk.italic.green("Options")}:`);
  console.log(`  ${chalk.bold.yellow("--help, -h")} - Show this help message.`);
  console.log(`  ${chalk.bold.yellow("--tomorrow, -t [days]")} - Get the schedule for [days] days from tomorrow (default 1).`);
  console.log(`  ${chalk.bold.yellow("--yesterday, -y [days]")} - Get the schedule for [days] days from yesterday (default 1).`);
  console.log(`  ${chalk.bold.yellow("--date, -d <date>")} - Get the schedule for a specific date.`);
  process.exit(0);
}

let spinner = ora(chalk.blueBright("Loading...")).start();

const login = JSON.parse(readFileSync("./login.json", "utf8"));

const ep = new Edupage();

const day = new Date(termArg("date", "d", new Date()));
const yesterdayArg = termArgVNR("yesterday", "y", null, "1");
const tomorrowArg = termArgVNR("tomorrow", "t", null, "1");
if(yesterdayArg != null) {
  day.setDate(day.getDate() - parseInt(yesterdayArg));
} else if(tomorrowArg != null) {
  day.setDate(day.getDate() + parseInt(tomorrowArg));
}

await ep.login(login.username, login.password);
const table = await ep.getTimetableForDate(day);
const lessons = table.lessons;
const testsToday = ep.tests.filter(l => isToday(l.fromDate) || isToday(l.toDate));
spinner.stop();

if(lessons.length == 0) {
  console.log(chalk.gray("🏠 No lessons"));
} else {
  for(const lesson of lessons) {
    console.log(
      lesson.isOnlineLesson ? "🏠" : "🏫" + " " +
      chalk.green(lesson.subject.name) +
      " with " + lesson.teachers.map(t => (t.gender == "F" ? chalk.magenta("Mrs. ") : chalk.blue("Mr. ")) + chalk.yellow(t.lastname)).join(", ") +
      (testsToday.find(t => t.period?.id == lesson.period?.id) != null ? " 📝" : "")
    );
  }
}


function isToday(date) {
  return date.getDate() === day.getDate() &&
    date.getMonth() === day.getMonth() &&
    date.getFullYear() === day.getFullYear();
}

function isSoon(date) {
  if(date.getTime() < day.getTime()) return false;
  const week = new Date();
  week.setDate(day.getDate() + 10);
  return date.getTime() <= week.getTime();
}

for(const test of testsToday) {
  console.log(chalk.red("📝 Class test") + " in " + chalk.green(test.subject.name) + " (" + chalk.blue(test.period?.id) + "): " + chalk.cyan(test.title));
}

for(const test of ep.assignments.filter(t => t.type == "bexam" && isSoon(t.toDate))) {
  console.log(chalk.redBright("📚 Class test soon") + " in " + chalk.green(test.subject.name) + ": " + chalk.cyan(test.title));
}

ep.exit();
