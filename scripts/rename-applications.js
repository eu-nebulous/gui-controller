// rename-applications.js
// Renames all application documents with Docker-style generated names + random suffix
// Usage: mongosh "mongodb://username:password@127.0.0.1:27018/admin" --file scripts/rename-applications.js
// Set DRY_RUN=false via environment or edit below to apply changes.

const DRY_RUN = typeof process !== 'undefined' && process.env.DRY_RUN === 'false' ? false : true;

// --- Word lists (Docker-inspired) ---
const adjectives = [
  "admiring", "agitated", "amazing", "angry", "awesome", "blissful", "bold", "brave",
  "busy", "charming", "clever", "cool", "compassionate", "confident", "cranky",
  "dazzling", "determined", "distracted", "dreamy", "eager", "ecstatic", "elastic",
  "elated", "elegant", "epic", "exciting", "fervent", "festive", "flamboyant",
  "focused", "friendly", "frosty", "gallant", "gifted", "goofy", "gracious",
  "happy", "hardcore", "harmonious", "heuristic", "hopeful", "hungry", "infallible",
  "inspiring", "intelligent", "interesting", "jolly", "jovial", "keen", "kind",
  "laughing", "loving", "lucid", "magical", "modest", "musing", "mystifying",
  "naughty", "nervous", "nice", "nifty", "nostalgic", "objective", "optimistic",
  "peaceful", "pedantic", "pensive", "practical", "priceless", "quirky", "quizzical",
  "recursing", "relaxed", "reverent", "romantic", "sad", "serene", "sharp",
  "silly", "sleepy", "stoic", "strange", "stupefied", "suspicious", "sweet",
  "tender", "thirsty", "trusting", "unruffled", "upbeat", "vibrant", "vigilant",
  "vigorous", "vivacious", "wizardly", "wonderful", "xenodochial", "youthful", "zealous",
  "zen"
];

const nouns = [
  "albatross", "antelope", "armadillo", "badger", "bandicoot", "barracuda",
  "basilisk", "bison", "bobcat", "buffalo", "butterfly", "capybara", "cardinal",
  "caribou", "caterpillar", "chameleon", "cheetah", "chinchilla", "chipmunk",
  "cobra", "condor", "coyote", "crane", "cricket", "crocodile", "dolphin",
  "dragonfly", "eagle", "elephant", "falcon", "ferret", "flamingo", "fox",
  "gazelle", "gecko", "giraffe", "gorilla", "grasshopper", "grizzly", "hamster",
  "hawk", "hedgehog", "heron", "hippo", "hornet", "hummingbird", "hyena",
  "ibex", "iguana", "impala", "jackal", "jaguar", "jellyfish", "kangaroo",
  "kingfisher", "koala", "komodo", "kookaburra", "lemur", "leopard", "lion",
  "llama", "lobster", "lynx", "macaw", "mammoth", "manatee", "mandrill",
  "meerkat", "mongoose", "moose", "narwhal", "newt", "nighthawk", "octopus",
  "ocelot", "orangutan", "orca", "osprey", "otter", "owl", "panther",
  "parrot", "peacock", "pelican", "penguin", "phoenix", "piranha", "platypus",
  "porcupine", "puffin", "python", "quail", "quetzal", "rabbit", "raccoon",
  "raven", "rhino", "salamander", "scorpion", "seahorse", "shark", "sparrow",
  "sphinx", "squid", "stallion", "starling", "stingray", "swan", "tapir",
  "tiger", "toucan", "turtle", "unicorn", "viper", "vulture", "walrus",
  "warthog", "weasel", "whale", "wolf", "wolverine", "wombat", "woodpecker",
  "yak", "zebra"
];

const suffixes = [
  "Cloud Only",
  "Edge+Cloud",
  "Linear UF",
  "SLO+SLA"
];

// --- Helpers ---
function toTitleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\+/g, '-plus-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateName(usedNames, org) {
  const prefix = org || "NebulOuS";
  let attempts = 0;
  while (attempts < 1000) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const name = prefix + " - " + toTitleCase(adj) + " " + toTitleCase(noun) + " - " + suffix;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    attempts++;
  }
  // Fallback: add a numeric disambiguator
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const num = Math.floor(Math.random() * 9999);
  const name = prefix + " - " + toTitleCase(adj) + " " + toTitleCase(noun) + " " + num + " - " + suffix;
  usedNames.add(name);
  return name;
}

function buildSearchText(title) {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// --- Main ---
print("=== Application Rename Script ===");
print("Mode: " + (DRY_RUN ? "DRY RUN (no changes)" : "LIVE - WRITING CHANGES"));
print("");

// Get all unique aposDocIds for applications that have "copy" in title or slug (case-insensitive)
const aposDocIds = db.aposDocs.distinct("aposDocId", {
  type: "application",
  $or: [
    { title: /copy/i },
    { slug: /-copy-/ }
  ]
});
const totalApps = db.aposDocs.distinct("aposDocId", { type: "application" }).length;
print("Total applications (by aposDocId): " + totalApps);
print("Applications with 'copy' (to be renamed): " + aposDocIds.length);
print("Applications untouched: " + (totalApps - aposDocIds.length));

const usedNames = new Set();
let totalUpdated = 0;
const changeLog = [];

for (const docId of aposDocIds) {
  // Get all mode variants for this application
  const docs = db.aposDocs.find({ aposDocId: docId, type: "application" }).toArray();
  if (docs.length === 0) continue;

  const oldTitle = docs[0].title;
  const org = docs[0].organization || null;
  const newTitle = generateName(usedNames, org);
  const newSlug = slugify(newTitle);
  const newTitleSortified = newTitle.toLowerCase();
  const searchText = buildSearchText(newTitle);
  const searchWords = searchText.split(' ').filter(w => w.length > 0);

  changeLog.push({
    aposDocId: docId,
    oldTitle: oldTitle,
    newTitle: newTitle,
    newSlug: newSlug,
    org: org || "(none)",
    modes: docs.map(d => d.aposMode)
  });

  if (!DRY_RUN) {
    for (const doc of docs) {
      db.aposDocs.updateOne(
        { _id: doc._id },
        {
          $set: {
            title: newTitle,
            slug: newSlug,
            titleSortified: newTitleSortified,
            highSearchText: searchText,
            highSearchWords: searchWords,
            lowSearchText: searchText,
            searchSummary: newTitle
          }
        }
      );
      totalUpdated++;
    }
  } else {
    totalUpdated += docs.length;
  }
}

print("");
print("--- Change Log (first 30) ---");
changeLog.slice(0, 30).forEach((c, i) => {
  print((i + 1) + ". [" + c.aposDocId + "] org=" + c.org + " (" + c.modes.join(", ") + ")");
  print("   OLD: " + c.oldTitle);
  print("   NEW: " + c.newTitle);
  print("   SLUG: " + c.newSlug);
  print("");
});

print("...");
print("");
print("=== Summary ===");
print("Applications renamed: " + changeLog.length);
print("Total documents " + (DRY_RUN ? "that would be updated" : "updated") + ": " + totalUpdated);
print("Suffix distribution:");
const suffixCounts = {};
changeLog.forEach(c => {
  const s = c.newTitle.split(" - ").pop();
  suffixCounts[s] = (suffixCounts[s] || 0) + 1;
});
Object.entries(suffixCounts).sort().forEach(([k, v]) => print("  " + k + ": " + v));

if (DRY_RUN) {
  print("");
  print(">>> This was a DRY RUN. No changes were made.");
  print(">>> To apply: DRY_RUN=false mongosh 'mongodb://username:password@127.0.0.1:27018/admin' --file scripts/rename-applications.js");
}
