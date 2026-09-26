import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "legacy-vault-backend",
  name: "Legacy Protocol Succession Engine",
  isDev: process.env.NODE_ENV === "production" ? false : true,
});
