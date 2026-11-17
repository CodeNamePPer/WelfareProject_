"use client";

import { useState } from "react";
import { useNavTransition } from "@/lib/useNavTransition";
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
  const nav = useNavTransition();
  const [user, setUser] = useState<User>(initialUser);

  return (
    <UserPanel
      user={user}
      orgOptions={orgOptions}
      managerChoices={managerChoices}
      mode="hr"
      onSaved={(updated) => {
        setUser(updated);
        nav.refresh();
      }}
    />
  );
}
