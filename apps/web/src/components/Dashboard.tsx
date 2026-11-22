import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Container,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { authClient } from "../lib/auth-client";
import { ApiError, api, type Reservation, type Room } from "../lib/api";

const fmt = (iso: string) => dayjs(iso).format("YYYY/MM/DD HH:mm");

export function Dashboard({ userName }: { userName: string }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [attendees, setAttendees] = useState<number>(1);
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [concurrencyResult, setConcurrencyResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [roomList, reservationList] = await Promise.all([
      api.listRooms(),
      api.listReservations(roomId ? Number(roomId) : undefined),
    ]);
    setRooms(roomList);
    setReservations(reservationList);
  }, [roomId]);

  useEffect(() => {
    refresh().catch((e) =>
      notifications.show({ color: "red", title: "読み込み失敗", message: (e as Error).message }),
    );
  }, [refresh]);

  const create = async () => {
    if (!roomId || !startAt || !endAt) {
      notifications.show({ color: "yellow", title: "入力不足", message: "部屋・開始・終了を指定してください" });
      return;
    }
    setLoading(true);
    try {
      await api.createReservation({
        roomId: Number(roomId),
        title,
        attendees,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });
      notifications.show({ color: "green", title: "予約完了", message: `${title} を予約しました` });
      setTitle("");
      await refresh();
    } catch (e) {
      const status = e instanceof ApiError ? ` (${e.status})` : "";
      notifications.show({ color: "red", title: `予約失敗${status}`, message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (id: number) => {
    try {
      await api.cancelReservation(id);
      notifications.show({ color: "blue", title: "キャンセル完了", message: `予約 #${id}` });
      await refresh();
    } catch (e) {
      notifications.show({ color: "red", title: "キャンセル失敗", message: (e as Error).message });
    }
  };

  /** Fire two parallel POSTs at the same slot; expect one 201 and one 409. */
  const runConcurrencyTest = async () => {
    if (!roomId || !startAt || !endAt) {
      notifications.show({ color: "yellow", title: "入力不足", message: "部屋・開始・終了を指定してください" });
      return;
    }
    setLoading(true);
    const make = (label: string) =>
      api
        .createReservation({
          roomId: Number(roomId),
          title: `${title || "テスト"} (${label})`,
          attendees,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        })
        .then(() => `${label}: 201 Created`)
        .catch((e: unknown) => `${label}: ${e instanceof ApiError ? e.status : "?"} ${(e as Error).message}`);
    try {
      const results = await Promise.all([make("A"), make("B")]);
      setConcurrencyResult(results.join(" / "));
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const roomName = (id: number) => rooms.find((r) => r.id === id)?.name ?? `#${id}`;

  return (
    <Container size="lg" my="lg">
      <Group justify="space-between" mb="md">
        <Title order={2}>予約ダッシュボード</Title>
        <Group>
          <Text size="sm" c="dimmed">
            {userName}
          </Text>
          <Button variant="subtle" size="sm" onClick={() => authClient.signOut().then(() => location.reload())}>
            ログアウト
          </Button>
        </Group>
      </Group>

      <Stack gap="lg">
        <Paper withBorder p="md">
          <Group grow align="flex-end">
            <Select
              label="会議室"
              placeholder="選択"
              data={rooms.map((r) => ({ value: String(r.id), label: `${r.name} (定員${r.capacity})` }))}
              value={roomId}
              onChange={setRoomId}
            />
            <TextInput label="タイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
            <NumberInput label="人数" min={1} value={attendees} onChange={(v) => setAttendees(Number(v) || 1)} />
            <TextInput
              label="開始"
              type="datetime-local"
              value={startAt ? dayjs(startAt).format("YYYY-MM-DDTHH:mm") : ""}
              onChange={(e) => setStartAt(e.target.value ? new Date(e.target.value) : null)}
            />
            <TextInput
              label="終了"
              type="datetime-local"
              value={endAt ? dayjs(endAt).format("YYYY-MM-DDTHH:mm") : ""}
              onChange={(e) => setEndAt(e.target.value ? new Date(e.target.value) : null)}
            />
          </Group>
          <Group mt="md">
            <Button onClick={create} loading={loading}>
              予約する
            </Button>
            <Button variant="outline" onClick={runConcurrencyTest} loading={loading}>
              同時送信テスト(2件並列)
            </Button>
          </Group>
          {concurrencyResult && (
            <Text size="sm" mt="sm">
              同時送信結果: {concurrencyResult}
            </Text>
          )}
        </Paper>

        <Paper withBorder p="md">
          <Title order={4} mb="sm">
            予約一覧
          </Title>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>部屋</Table.Th>
                <Table.Th>タイトル</Table.Th>
                <Table.Th>人数</Table.Th>
                <Table.Th>開始</Table.Th>
                <Table.Th>終了</Table.Th>
                <Table.Th>状態</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reservations.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{r.id}</Table.Td>
                  <Table.Td>{roomName(r.roomId)}</Table.Td>
                  <Table.Td>{r.title}</Table.Td>
                  <Table.Td>{r.attendees}</Table.Td>
                  <Table.Td>{fmt(r.startAt)}</Table.Td>
                  <Table.Td>{fmt(r.endAt)}</Table.Td>
                  <Table.Td>
                    <Badge color={r.status === "confirmed" ? "green" : "gray"}>{r.status}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {r.status === "confirmed" && (
                      <Button size="xs" variant="light" color="red" onClick={() => cancel(r.id)}>
                        キャンセル
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              {reservations.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Loader size="sm" /> 予約がありません
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Container>
  );
}
