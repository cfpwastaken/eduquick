#!/usr/bin/env node
import { Edupage } from "edupage-api";
import { readFileSync } from "node:fs";
import ora from "ora";

let spinner = ora("Loading...").start();

const login = JSON.parse(readFileSync("./login.json", "utf8"));

const ep = new Edupage();

const day = new Date();

await ep.login(login.username, login.password);
const table = await ep.getTimetableForDate(day);
const lessons = table.lessons;
const testsToday = ep.tests.filter(l => isToday(l.fromDate) || isToday(l.toDate));
spinner.stop();

for(const lesson of lessons) {
  console.log(
    lesson.isOnlineLesson ? "🏠" : "🏫" + " " +
    lesson.subject.name +
    " with " + lesson.teachers.map(t => (t.gender == "F" ? "Mrs. " : "Mr. ") + t.lastname).join(", ") +
    (testsToday.find(t => t.period?.id == lesson.period?.id) != null ? " 📝" : "")
  );
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
  console.log("📝 Class test in " + test.subject.name + " (" + test.period.id + "): " + test.title);
}

for(const test of ep.assignments.filter(t => t.type == "bexam" && isSoon(t.toDate))) {
  console.log("📚 Class test soon in " + test.subject.name + ": " + test.title);
}

ep.exit();
