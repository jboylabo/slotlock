import { useState } from "react";
import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Tabs,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { authClient } from "../lib/auth-client";

export function AuthForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [tab, setTab] = useState<string | null>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await authClient.signUp.email({ name, email, password });
        if (error) throw new Error(error.message ?? "サインアップに失敗しました");
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) throw new Error(error.message ?? "ログインに失敗しました");
      }
      onAuthenticated();
    } catch (e) {
      notifications.show({ color: "red", title: "認証エラー", message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Title order={2} ta="center" mb="md">
        slotlock
      </Title>
      <Paper withBorder shadow="md" p="lg" radius="md">
        <Tabs value={tab} onChange={setTab}>
          <Tabs.List grow mb="md">
            <Tabs.Tab value="login">ログイン</Tabs.Tab>
            <Tabs.Tab value="signup">新規登録</Tabs.Tab>
          </Tabs.List>
          <Stack>
            {tab === "signup" && (
              <TextInput label="名前" value={name} onChange={(e) => setName(e.target.value)} required />
            )}
            <TextInput
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              label="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button onClick={submit} loading={loading} fullWidth>
              {tab === "signup" ? "登録" : "ログイン"}
            </Button>
            <Anchor size="sm" ta="center" onClick={() => setTab(tab === "login" ? "signup" : "login")}>
              {tab === "login" ? "アカウントを作成" : "ログインへ"}
            </Anchor>
          </Stack>
        </Tabs>
      </Paper>
    </Container>
  );
}
