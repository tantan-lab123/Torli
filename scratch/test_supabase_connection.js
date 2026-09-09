const https = require("https");
const fs = require("fs");
const path = require("path");

// Read .env.local
const envPath = path.join(__dirname, "..", ".env.local");
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        env[key] = val;
      }
    }
  });
}

const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log("=== בדיקת חיבור ל-Supabase ===");
console.log("URL:", supabaseUrl);
console.log("Anon Key:", anonKey ? anonKey.substring(0, 20) + "..." : "חסר!");
console.log("Service Key:", serviceKey ? serviceKey.substring(0, 20) + "..." : "חסר!");

if (!supabaseUrl || (!anonKey && !serviceKey)) {
  console.error("\n❌ חסרים פרטי חיבור בקובץ .env.local");
  process.exit(1);
}

function queryTable(table) {
  return new Promise((resolve) => {
    const urlObj = new URL(`${supabaseUrl}/rest/v1/${table}?select=*&limit=3`);
    const req = https.request(
      urlObj,
      {
        method: "GET",
        headers: {
          apikey: serviceKey || anonKey,
          Authorization: `Bearer ${serviceKey || anonKey}`,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on("error", (err) => resolve({ status: 0, error: err.message }));
    req.end();
  });
}

async function test() {
  console.log("\n1. פונה ל-PostgreSQL ב-Supabase...");
  const bRes = await queryTable("businesses");

  if (bRes.status === 200) {
    console.log("✓ החיבור הצליח ב-100%! טבלת businesses קיימת ונגישה.");
    console.log(`  (קיימים כרגע ${bRes.body.length} עסקים רשומים במסד הנתונים)`);

    console.log("\n2. בודק טבלאות נוספות...");
    const [sRes, cRes, aRes] = await Promise.all([
      queryTable("services"),
      queryTable("clients"),
      queryTable("appointments"),
    ]);

    console.log("✓ טבלת שירותים (services):", sRes.status === 200 ? "תקינה ✓" : `סטטוס ${sRes.status}`);
    console.log("✓ טבלת לקוחות (clients):", cRes.status === 200 ? "תקינה ✓" : `סטטוס ${cRes.status}`);
    console.log("✓ טבלת תורים (appointments):", aRes.status === 200 ? "תקינה ✓" : `סטטוס ${aRes.status}`);

    console.log("\n🎉 הכל מוגדר ועובד מושלם מול Supabase!");
  } else if (bRes.status === 404 || (bRes.body && bRes.body.message && bRes.body.message.includes("does not exist"))) {
    console.log("⚠️ החיבור ל-Supabase עובד והמפתחות תקינים, אבל הטבלאות עדיין לא נוצרו!");
    console.log("👉 שלב קצר שנותר: היכנס ל-SQL Editor ב-Supabase, הדבק את התוכן של supabase/schema.sql ולחץ Run.");
  } else {
    console.log("תגובת שרת Supabase:", bRes.status, bRes.body || bRes.error);
  }
}

test();
