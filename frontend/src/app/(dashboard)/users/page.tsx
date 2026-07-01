"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { users, UserDto } from "@/lib/api";
import { useUser, useIsAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Pencil, Trash2, KeyRound, Users as UsersIcon } from "lucide-react";

const ROLE_META: Record<string, { label: string; badgeClass: string }> = {
  admin:  { label: "관리자", badgeClass: "ct-badge ct-badge-blue" },
  pm:     { label: "PM",     badgeClass: "ct-badge ct-badge-green" },
  viewer: { label: "열람",   badgeClass: "ct-badge ct-badge-gray" },
};

const EMPTY_CREATE = { email: "", name: "", password: "", role: "viewer" };
const EMPTY_EDIT   = { name: "", role: "viewer" };

function LabeledInput({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded text-sm outline-none"
        style={{ border: "1px solid #E6E6E6", color: "#333" }}
      />
    </div>
  );
}

function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>역할*</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded text-sm outline-none"
        style={{ border: "1px solid #E6E6E6", color: "#333" }}
      >
        <option value="viewer">열람 (VIEWER)</option>
        <option value="pm">PM</option>
        <option value="admin">관리자 (ADMIN)</option>
      </select>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useUser();
  const isAdmin = useIsAdmin();

  const [showCreate, setShowCreate]     = useState(false);
  const [createForm, setCreateForm]     = useState(EMPTY_CREATE);
  const [editTarget, setEditTarget]     = useState<UserDto | null>(null);
  const [editForm, setEditForm]         = useState(EMPTY_EDIT);
  const [pwdTarget, setPwdTarget]       = useState<UserDto | null>(null);
  const [newPassword, setNewPassword]   = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);

  useEffect(() => {
    if (currentUser !== null && !isAdmin) {
      router.push("/dashboard");
    }
  }, [currentUser, isAdmin, router]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: users.getAll,
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (f: typeof EMPTY_CREATE) => users.create(f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, f }: { id: number; f: typeof EMPTY_EDIT }) =>
      users.update(id, f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditTarget(null);
    },
  });

  const resetPwdMutation = useMutation({
    mutationFn: ({ id, pwd }: { id: number; pwd: string }) =>
      users.resetPassword(id, pwd),
    onSuccess: () => {
      setPwdTarget(null);
      setNewPassword("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => users.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
    },
  });

  const openEdit = (u: UserDto) => {
    setEditTarget(u);
    setEditForm({ name: u.name, role: u.role });
  };

  const isSelf = (u: UserDto) => currentUser?.id === u.id;

  if (!isAdmin) return null;

  const list = data as UserDto[];

  return (
    <div>
      <PageHeader
        title="사용자 관리"
        subtitle={`등록된 사용자 ${list.length}명`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <Plus size={14} />
            사용자 등록
          </button>
        }
      />

      <div className="p-6">
        <div className="ct-card overflow-hidden">
          <table className="ct-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>역할</th>
                <th>가입일</th>
                <th style={{ width: 200 }}>비고</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12" style={{ color: "#AAA" }}>
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-14">
                    <UsersIcon size={36} style={{ color: "#DDD", margin: "0 auto 10px" }} />
                    <div style={{ color: "#AAA", fontSize: 13 }}>등록된 사용자가 없습니다.</div>
                  </td>
                </tr>
              ) : (
                list.map((u) => {
                  const self = isSelf(u);
                  const meta = ROLE_META[u.role] ?? { label: u.role, badgeClass: "ct-badge ct-badge-gray" };
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="font-medium" style={{ color: "#333" }}>{u.name}</span>
                        {self && (
                          <span className="ml-2 text-xs" style={{ color: "#AAA" }}>(나)</span>
                        )}
                      </td>
                      <td style={{ color: "#666" }}>{u.email}</td>
                      <td>
                        <span className={meta.badgeClass}>{meta.label}</span>
                      </td>
                      <td style={{ color: "#888", fontSize: 12 }}>
                        {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => !self && openEdit(u)}
                            disabled={self}
                            title={self ? "자신의 계정은 수정할 수 없습니다" : undefined}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-[#F5F5F5]"
                            style={{ color: self ? "#CCC" : "#1C90FB", cursor: self ? "not-allowed" : "pointer" }}
                          >
                            <Pencil size={11} />수정
                          </button>
                          <button
                            onClick={() => { setPwdTarget(u); setNewPassword(""); }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-[#F5F5F5]"
                            style={{ color: "#F5A623" }}
                          >
                            <KeyRound size={11} />비번초기화
                          </button>
                          <button
                            onClick={() => !self && setDeleteTarget(u)}
                            disabled={self}
                            title={self ? "자신의 계정은 삭제할 수 없습니다" : undefined}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-[#F5F5F5]"
                            style={{ color: self ? "#CCC" : "#FC5356", cursor: self ? "not-allowed" : "pointer" }}
                          >
                            <Trash2 size={11} />삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 사용자 등록 모달 */}
      {showCreate && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCreate(false); setCreateForm(EMPTY_CREATE); } }}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <h3 className="font-semibold text-base mb-4" style={{ color: "#333" }}>사용자 등록</h3>
            {createMutation.isError && (
              <div className="mb-3 px-3 py-2 rounded text-xs" style={{ background: "#FFF0F0", color: "#FC5356" }}>
                {(createMutation.error as Error).message}
              </div>
            )}
            <div className="space-y-3">
              <LabeledInput label="이름*" value={createForm.name}
                onChange={(v) => setCreateForm((f) => ({ ...f, name: v }))} placeholder="홍길동" />
              <LabeledInput label="이메일*" value={createForm.email} type="email"
                onChange={(v) => setCreateForm((f) => ({ ...f, email: v }))} placeholder="user@company.com" />
              <LabeledInput label="초기 비밀번호*" value={createForm.password} type="password"
                onChange={(v) => setCreateForm((f) => ({ ...f, password: v }))} placeholder="6자 이상" />
              <RoleSelect value={createForm.role} onChange={(v) => setCreateForm((f) => ({ ...f, role: v }))} />
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setShowCreate(false); setCreateForm(EMPTY_CREATE); }}
                className="flex-1 py-2 rounded text-sm ct-btn-secondary"
              >
                취소
              </button>
              <button
                onClick={() => createMutation.mutate(createForm)}
                disabled={!createForm.name || !createForm.email || createForm.password.length < 6 || createMutation.isPending}
                className="flex-1 py-2 rounded text-sm text-white font-medium"
                style={{ background: createForm.name && createForm.email && createForm.password.length >= 6 ? "#1C90FB" : "#AAA" }}
              >
                {createMutation.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 수정 모달 */}
      {editTarget && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditTarget(null); }}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <h3 className="font-semibold text-base mb-4" style={{ color: "#333" }}>사용자 수정</h3>
            <div className="mb-3 px-3 py-2 rounded text-xs" style={{ background: "#F8F8F8", color: "#888" }}>
              이메일: {editTarget.email} (변경 불가)
            </div>
            {updateMutation.isError && (
              <div className="mb-3 px-3 py-2 rounded text-xs" style={{ background: "#FFF0F0", color: "#FC5356" }}>
                {(updateMutation.error as Error).message}
              </div>
            )}
            <div className="space-y-3">
              <LabeledInput label="이름*" value={editForm.name}
                onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} />
              <RoleSelect value={editForm.role} onChange={(v) => setEditForm((f) => ({ ...f, role: v }))} />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditTarget(null)} className="flex-1 py-2 rounded text-sm ct-btn-secondary">취소</button>
              <button
                onClick={() => updateMutation.mutate({ id: editTarget.id, f: editForm })}
                disabled={!editForm.name || updateMutation.isPending}
                className="flex-1 py-2 rounded text-sm text-white font-medium"
                style={{ background: editForm.name ? "#1C90FB" : "#AAA" }}
              >
                {updateMutation.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 비밀번호 초기화 모달 */}
      {pwdTarget && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setPwdTarget(null); setNewPassword(""); } }}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <h3 className="font-semibold text-base mb-1" style={{ color: "#333" }}>비밀번호 초기화</h3>
            <p className="text-xs mb-4" style={{ color: "#888" }}>
              {pwdTarget.name} ({pwdTarget.email})
            </p>
            {resetPwdMutation.isError && (
              <div className="mb-3 px-3 py-2 rounded text-xs" style={{ background: "#FFF0F0", color: "#FC5356" }}>
                {(resetPwdMutation.error as Error).message}
              </div>
            )}
            <LabeledInput
              label="새 비밀번호*"
              value={newPassword}
              type="password"
              onChange={setNewPassword}
              placeholder="6자 이상"
            />
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setPwdTarget(null); setNewPassword(""); }}
                className="flex-1 py-2 rounded text-sm ct-btn-secondary"
              >
                취소
              </button>
              <button
                onClick={() => resetPwdMutation.mutate({ id: pwdTarget.id, pwd: newPassword })}
                disabled={newPassword.length < 6 || resetPwdMutation.isPending}
                className="flex-1 py-2 rounded text-sm text-white font-medium"
                style={{ background: newPassword.length >= 6 ? "#F5A623" : "#AAA" }}
              >
                {resetPwdMutation.isPending ? "초기화 중..." : "초기화"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#FFF0F0" }}
              >
                <Trash2 size={18} style={{ color: "#FC5356" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#333" }}>사용자 삭제</p>
                <p className="text-xs mt-0.5" style={{ color: "#888" }}>삭제하면 복구할 수 없습니다.</p>
              </div>
            </div>
            {removeMutation.isError && (
              <div className="mb-3 px-3 py-2 rounded text-xs" style={{ background: "#FFF0F0", color: "#FC5356" }}>
                {(removeMutation.error as Error).message}
              </div>
            )}
            <p className="text-sm mb-5" style={{ color: "#555" }}>
              <span className="font-medium" style={{ color: "#FC5356" }}>{deleteTarget.name}</span>
              {" "}({deleteTarget.email}) 계정을 삭제하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 rounded text-sm ct-btn-secondary">취소</button>
              <button
                onClick={() => removeMutation.mutate(deleteTarget.id)}
                disabled={removeMutation.isPending}
                className="flex-1 py-2 rounded text-sm text-white font-medium"
                style={{ background: "#FC5356" }}
              >
                {removeMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
