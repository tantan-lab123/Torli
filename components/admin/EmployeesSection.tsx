"use client";

import React, { useState } from "react";
import { Plus, Eye, EyeOff, Trash2 } from "lucide-react";
import { Employee, Service } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatPhone, triggerHaptic } from "@/lib/utils";

interface EmployeesSectionProps {
  employees: Employee[];
  services?: Service[];
  businessId: string;
  onAddEmployee?: (emp: Partial<Employee>) => void;
  onToggleVisibility?: (empId: string) => void;
  onDeleteEmployee?: (empId: string) => void;
}

export const EmployeesSection: React.FC<EmployeesSectionProps> = ({
  employees,
  businessId,
  onAddEmployee,
  onToggleVisibility,
  onDeleteEmployee,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empRole, setEmpRole] = useState<"owner" | "manager" | "staff">("staff");
  const [empVisible, setEmpVisible] = useState(true);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empPhone.trim()) return;

    triggerHaptic(25);
    const newEmp: Partial<Employee> = {
      id: "emp-" + Math.random().toString(36).substring(2, 9),
      business_id: businessId,
      name: empName.trim(),
      phone: empPhone.trim(),
      role: empRole,
      is_visible_online: empVisible,
      avatar_color: "bg-indigo-600",
    };

    if (onAddEmployee) {
      onAddEmployee(newEmp);
    }

    setIsAddModalOpen(false);
    setEmpName("");
    setEmpPhone("");
    setEmpRole("staff");
    setEmpVisible(true);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-right">
          <h2 className="text-sm font-extrabold text-slate-900">ניהול צוות ועובדים</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            הגדר אילו עובדים מוצגים בדף הזימון הציבורי, הגדר תפקידים והרשאות
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            triggerHaptic(15);
            setIsAddModalOpen(true);
          }}
          className="shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4 ml-1" />
          <span>הוסף עובד חדש</span>
        </Button>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {employees.map((emp) => {
          const isOwner = emp.role === "owner";
          const isManager = emp.role === "manager";

          return (
            <Card
              key={emp.id}
              className="p-4 bg-white border border-slate-200/90 shadow-xs text-right space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                    {emp.name[0]}
                  </div>
                  {onDeleteEmployee && !isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(20);
                        if (confirm(`האם אתה בטוח שברצונך למחוק את העובד "${emp.name}"?`)) {
                          onDeleteEmployee(emp.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="מחק עובד מהמערכת"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex-1 text-right">
                  <div className="font-extrabold text-slate-900 text-sm flex items-center justify-end gap-1.5">
                    <span>{emp.name}</span>
                    {isOwner ? (
                      <Badge variant="default" className="text-[10px]">
                        בעלים
                      </Badge>
                    ) : isManager ? (
                      <Badge variant="secondary" className="text-[10px]">
                        מנהל
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px]">
                        צוות
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5" dir="ltr">
                    {formatPhone(emp.phone)}
                  </div>
                </div>
              </div>

              {/* Status / Visibility toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    if (onToggleVisibility) onToggleVisibility(emp.id);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold transition-colors ${
                    emp.is_visible_online
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                  }`}
                  title="לחץ כדי לשנות נראות"
                >
                  {emp.is_visible_online ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>מוצג באתר ללקוחות</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>מוסתר מדף הזימון</span>
                    </>
                  )}
                </button>

                <span className="text-slate-400 text-[11px]">
                  {isOwner ? "גישה מלאה" : "יומן בלבד"}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Employee Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="הוספת איש צוות חדש">
        <form onSubmit={handleCreate} className="space-y-3.5 text-right">
          <Input
            label="שם מלא *"
            placeholder="לדוגמה: רון שמעוני"
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
            required
          />

          <Input
            label="מספר טלפון *"
            type="tel"
            placeholder="050-1234567"
            dir="ltr"
            className="text-right"
            value={empPhone}
            onChange={(e) => setEmpPhone(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">תפקיד והרשאה</label>
            <select
              value={empRole}
              onChange={(e) => setEmpRole(e.target.value as any)}
              className="w-full h-11 rounded-2xl border border-slate-200 px-3 text-sm bg-white font-medium"
            >
              <option value="staff">עובד רגיל (גישה ליומן תורים)</option>
              <option value="manager">מנהל (גישה ליומן + לקוחות)</option>
              <option value="owner">בעל עסק (גישה מלאה כולל הגדרות)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-700">הצג עובד זה בדף הזימון הציבורי של הלקוחות</span>
            <input
              type="checkbox"
              checked={empVisible}
              onChange={(e) => setEmpVisible(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" className="flex-1">
              שמור עובד
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
