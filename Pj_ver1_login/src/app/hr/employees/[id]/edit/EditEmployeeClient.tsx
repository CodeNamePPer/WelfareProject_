"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPanel, type Choice, type User } from "@/app/admin/users/AdminUsersClient";
import type { OrgOptions } from "@/lib/auth/users";

export function EditEmployeeClient({
  initialUser,
  orgOptions,
  managerChoices,
}: {
  initialUser: User;
  orgOptions: OrgOptions;
  managerChoices: Choice[];
}) {
  const router = useRouter();
  const [user, setUser] = useState<User>(initialUser);

  return (
    <UserPanel
      user={user}
      orgOptions={orgOptions}
      managerChoices={managerChoices}
      mode="hr"
      onSaved={(updated) => {
        setUser(updated);
        router.refresh();
      }}
    />
  );
}
