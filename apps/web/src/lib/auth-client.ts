import { createAuthClient } from "better-auth/vue";

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    fetchOptions: {
        credentials: "include",
    },
    user: {
        additionalFields: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            graduationYear: { type: "number" },
            alumniId: { type: "string" },
        },
    },
});
