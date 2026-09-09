const http = require("http");

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let resData = "";
        res.on("data", (chunk) => (resData += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(resData) });
          } catch (e) {
            resolve({ status: res.statusCode, body: resData });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path,
        method: "GET",
      },
      (res) => {
        let resData = "";
        res.on("data", (chunk) => (resData += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(resData) });
          } catch (e) {
            resolve({ status: res.statusCode, body: resData });
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function runTests() {
  console.log("--- TEST 1: Password Validation rules ---");
  // Test via API registration
  const weakRes = await post("/api/business", {
    name: "עסק בדיקה",
    slug: "test-weak-" + Date.now(),
    owner_phone: "0509998877",
    password: "NoSpecialChar123",
  });
  console.log("Missing special char rejected:", weakRes.status === 400 ? "PASS ✓" : "FAIL ✗", weakRes.body);

  const strongRes = await post("/api/business", {
    name: "עסק חדש מאובטח",
    slug: "test-strong-" + Date.now(),
    owner_phone: "0509998877",
    password: "StrongPass2026!",
  });
  console.log("Strong password with special char accepted:", strongRes.status === 200 ? "PASS ✓" : "FAIL ✗", strongRes.body?.business?.name);

  console.log("\n--- TEST 2: Owner Login with Strong Password, Legacy PIN, and Google ---");
  const passLogin = await post("/api/auth/login", {
    phone: "0541234567",
    password: "BarberDan2026!",
  });
  console.log("Login with strong password (BarberDan2026!):", passLogin.status === 200 ? "PASS ✓" : "FAIL ✗", passLogin.body?.business?.slug);

  const pinLogin = await post("/api/auth/login", {
    phone: "0541234567",
    pin: "1234",
  });
  console.log("Login with legacy PIN 1234:", pinLogin.status === 200 ? "PASS ✓" : "FAIL ✗", pinLogin.body?.business?.slug);

  const googleOwnerLogin = await post("/api/auth/login", {
    provider: "google",
    email: "dan@barber-dan.co.il",
    googleId: "google-1234",
  });
  console.log("Login with Google (Owner):", googleOwnerLogin.status === 200 ? "PASS ✓" : "FAIL ✗", googleOwnerLogin.body?.business?.slug);

  console.log("\n--- TEST 3: Client Booking (Guest & Google - Zero Passwords) ---");
  // Look up Barber Dan services
  const danBiz = await get("/api/business?slug=barber-dan");
  const services = await get(`/api/services?business_id=${danBiz.body.id}`);
  const serviceId = services.body[0].id;

  const guestBooking = await post("/api/appointments", {
    business_id: danBiz.body.id,
    service_id: serviceId,
    phone: "0531112233",
    first_name: "דני",
    last_name: "האורח",
    auth_provider: "guest",
    start_time: new Date(Date.now() + 86400000 * 2).toISOString(),
  });
  console.log("Guest client booking (NO password):", guestBooking.status === 200 ? "PASS ✓" : "FAIL ✗", guestBooking.body?.client?.first_name);

  const googleClientBooking = await post("/api/appointments", {
    business_id: danBiz.body.id,
    service_id: serviceId,
    phone: "0534445566",
    first_name: "עומר",
    last_name: "גוגל",
    email: "omer.client@gmail.com",
    google_id: "google-sub-omer",
    auth_provider: "google",
    start_time: new Date(Date.now() + 86400000 * 3).toISOString(),
  });
  console.log("Google client booking (NO password):", googleClientBooking.status === 200 ? "PASS ✓" : "FAIL ✗", googleClientBooking.body?.client?.email);

  console.log("\n--- TEST 4: Historical Past Appointments Inspection ---");
  const allApps = await get(`/api/appointments?business_id=${danBiz.body.id}`);
  const pastApps = allApps.body.filter(a => new Date(a.start_time) < new Date());
  console.log("Found past appointments in DB:", pastApps.length > 0 ? "PASS ✓" : "FAIL ✗", `(${pastApps.length} past appointments)`);
  pastApps.forEach(a => {
    console.log(`  • ID: ${a.id}, Time: ${a.start_time}, Client: ${a.client?.first_name || a.client_id}, Notes: ${a.notes}`);
  });
}

runTests().catch(console.error);
