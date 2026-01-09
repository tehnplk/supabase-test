"use client";

import { useState } from "react";
import { upsertActivity, deleteActivity } from "./actions";

type Activity = {
  id: string;
  activity_type: string;
  distance_km: number | null;
  duration_minutes: number | null;
  calories: number | null;
  occurred_at: string;
  notes: string | null;
};

export default function ActivityManager({ activities }: { activities: Activity[] }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;
    const res = await deleteActivity(id);
    if (res.error) {
      alert(res.error);
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingActivity(null);
  };

  // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatDateForInput = (isoString?: string) => {
    if (!isoString) return new Date().toISOString().slice(0, 16);
    const date = new Date(isoString);
    // Adjust to local time awareness if needed, but for simplicity here strictly chopping ISO
    // If the DB stores UTC, rendering might need adjustment. 
    // For now, let's keep it simple: just use the string if it's compatible or default.
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">My activities</h2>
        <button
          onClick={() => {
            setEditingActivity(null);
            setIsFormOpen(true);
          }}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Add Activity
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-medium">
              {editingActivity ? "Edit Activity" : "New Activity"}
            </h3>
            <form
              action={async (formData) => {
                const res = await upsertActivity(formData);
                if (res?.error) {
                  alert(res.error);
                } else {
                  closeForm();
                }
              }}
              className="space-y-4"
            >
              {editingActivity && (
                <input type="hidden" name="id" value={editingActivity.id} />
              )}
              
              <div>
                <label className="block text-sm font-medium">Type</label>
                <select
                  name="activity_type"
                  defaultValue={editingActivity?.activity_type || "Run"}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                >
                  <option value="Run">Run</option>
                  <option value="Swim">Swim</option>
                  <option value="Cycle">Cycle</option>
                  <option value="Walk">Walk</option>
                  <option value="Gym">Gym</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Distance (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="distance_km"
                    defaultValue={editingActivity?.distance_km ?? 0}
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Duration (min)</label>
                  <input
                    type="number"
                    step="1"
                    name="duration_minutes"
                    defaultValue={editingActivity?.duration_minutes ?? 0}
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Calories</label>
                <input
                  type="number"
                  step="1"
                  name="calories"
                  defaultValue={editingActivity?.calories ?? 0}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Date & Time</label>
                <input
                  type="datetime-local"
                  name="occurred_at"
                  defaultValue={formatDateForInput(editingActivity?.occurred_at)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={editingActivity?.notes || ""}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
             <tr className="text-left text-xs uppercase text-zinc-500 dark:text-zinc-400">
              <th className="pb-2 pr-4">Date</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4">Dist (km)</th>
              <th className="pb-2 pr-4">Dur (min)</th>
              <th className="pb-2 pr-4">Cal</th>
              <th className="pb-2 pr-4">Notes</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {activities.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4 text-center text-zinc-500">
                  No activities found. Add one!
                </td>
              </tr>
            ) : (
              activities.map((a) => (
                <tr key={a.id}>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(a.occurred_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 capitalize">{a.activity_type}</td>
                  <td className="py-2 pr-4">{a.distance_km?.toFixed(2)}</td>
                  <td className="py-2 pr-4">{a.duration_minutes}</td>
                  <td className="py-2 pr-4">{a.calories}</td>
                  <td className="py-2 pr-4 max-w-xs truncate">{a.notes || "-"}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleEdit(a)}
                      className="mr-3 text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-red-600 hover:text-red-500 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
