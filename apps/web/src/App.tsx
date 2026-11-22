import { useEffect, useState } from "react";
import { Center, Loader, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import { AuthForm } from "./components/AuthForm";
import { Dashboard } from "./components/Dashboard";
import { authClient } from "./lib/auth-client";

export default function App() {
  const [userName, setUserName] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const refreshSession = async () => {
    const { data } = await authClient.getSession();
    setUserName(data?.user.name ?? null);
    setChecking(false);
  };

  useEffect(() => {
    refreshSession();
  }, []);

  return (
    <MantineProvider>
      <Notifications />
      {checking ? (
        <Center h="100vh">
          <Loader />
        </Center>
      ) : userName ? (
        <Dashboard userName={userName} />
      ) : (
        <AuthForm onAuthenticated={refreshSession} />
      )}
    </MantineProvider>
  );
}
