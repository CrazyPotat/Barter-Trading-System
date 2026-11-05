
const bcrypt = require("bcryptjs");
const db = require("./config/db");

const testUsers = [
    {
        full_name: "Test User",
        email: "test@example.com",
        password: "TestUser123!"
    },
    {
        full_name: "Christine",
        email: "christine@example.com",
        password: "Christine123!"
    }
];

async function createTestUsers() {
    try {
        for (const user of testUsers) {
            const existing = await db.query(
                "SELECT id FROM users WHERE email = $1",
                [user.email]
            );

            if (existing.rows.length > 0) {
                console.log(`${user.email} already exists. Skipped.`);
                continue;
            }

            const passwordHash = await bcrypt.hash(
                user.password,
                10
            );

            await db.query(
                `INSERT INTO users
                    (full_name, email, password_hash, role)
                 VALUES ($1, $2, $3, 'user')
                 RETURNING id`,
                [
                    user.full_name,
                    user.email,
                    passwordHash
                ]
            );

            console.log(`${user.email} created successfully!`);
        }

        console.log("Demo account seeding completed!");

    } catch (error) {
        console.error("Error creating test users:", error);
        process.exitCode = 1;

    } finally {
        await db.end();
    }
}

createTestUsers();
