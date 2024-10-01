const file = Bun.file("README.md");

const before = await file.text();

const docs = await fetch("http://localhost:46982/swagger/json").then((r) =>
  r.json()
);

const contents = [
  "<!-- begin api list -->",
  "",
  "<!-- prettier-ignore -->",
  "| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;API&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description |",
  "| --- | --- |",
];
for (const tag of docs.tags) {
  const slug = tag.name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const url = `https://mockapis.onrender.com/swagger#tag/${slug}`;
  const description = (tag.description || "").split("\n")[0];
  contents.push(`| [**${tag.name}**](${url}) | ${description} |`);
}
contents.push("", "<!-- end api list -->");

const after = before.replace(
  /<!-- begin api list -->[^]*?<!-- end api list -->/,
  contents.join("\n")
);
if (before === after) {
  console.warn("README.md is up-to-date.");
} else {
  await Bun.write(file, after);
  console.log("README.md has been updated.");
}
