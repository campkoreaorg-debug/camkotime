
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "../ui/label";
import { useSession } from "@/hooks/use-session";
import { Loader2 } from "lucide-react";

export function PublicSessionSelector() {
  const { sessions, publicSessionId, setPublicSession, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>뷰어 설정 로딩...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="public-session-selector" className="text-sm font-medium text-muted-foreground">
        뷰어 차수:
      </Label>
      <Select
        value={publicSessionId ?? ""}
        onValueChange={(value) => setPublicSession(value)}
      >
        <SelectTrigger id="public-session-selector" className="w-[180px]">
          <SelectValue placeholder="뷰어에게 보일 차수 선택..." />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="none">공개 안함</SelectItem>
          {sessions.map((session) => (
            <SelectItem key={session.id} value={session.id}>
              {session.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
