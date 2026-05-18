const res = await fetch(
  "https://api.github.com/repos/obsidianmd/obsidian-releases/releases/latest",
  { headers: { "User-Agent": "ocr-extractor" } },
);
if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

const { tag_name } = await res.json();
console.log(tag_name.replace(/^v/, ""));
