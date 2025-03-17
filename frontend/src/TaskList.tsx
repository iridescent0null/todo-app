import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Task, fetchTasks, createTask, updateTask, deleteTask } from "./api";

type StatusType = Task["status"]; // '未着手' | '進行中' | '完了'

const bubbleColorMap: Record<StatusType, string> = {
  "未着手": "bg-pink-200 text-pink-800",
  "進行中": "bg-blue-200 text-blue-800",
  "完了":   "bg-green-200 text-green-800",
};

const ALL_STATUSES: StatusType[] = ["未着手", "進行中", "完了"];

function TaskList() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialView = (params.get("view") as "table" | "board") || "table";
  const [viewMode, setViewMode] = useState<"table" | "board">(initialView);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDetails, setNewTaskDetails] = useState("");
  const [editingNewTask, setEditingNewTask] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    const newParams = new URLSearchParams(location.search);
    newParams.set("view", viewMode);
    navigate({ search: newParams.toString() }, { replace: true });
  }, [viewMode]);

  const loadTasks = async () => {
    try {
      const data = await fetchTasks();
      setTasks(data || []);
    } catch (error) {
      console.error("タスク取得に失敗", error);
      setTasks([]);
    }
  };

  const handleCreate = async () => {
    if (!newTaskName.trim()) {
      setEditingNewTask(false);
      return;
    }
    try {
      await createTask({
        name: newTaskName.trim(),
        details: newTaskDetails.trim(),
        status: "未着手",
      });
      setNewTaskName("");
      setNewTaskDetails("");
      setEditingNewTask(false);
      loadTasks();
    } catch (error) {
      console.error("タスク作成に失敗", error);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: StatusType) => {
    try {
      await updateTask(task.id, {
        name: task.name,
        details: task.details,
        status: newStatus,
      });
      loadTasks();
    } catch (error) {
      console.error("ステータス更新に失敗", error);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteTask(id);
      loadTasks();
    } catch (error) {
      console.error("タスク削除に失敗", error);
    }
  };

  const toggleStatus = (status: StatusType) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const statusFilterLabel = (() => {
    if (selectedStatuses.length === 0 || selectedStatuses.length === ALL_STATUSES.length) {
      return "すべて";
    }
    return `${selectedStatuses.length}件選択中`;
  })();

  const filteredTasks = tasks.filter((task) => {
    const matchText =
      task.name.toLowerCase().includes(filterText.toLowerCase()) ||
      task.details.toLowerCase().includes(filterText.toLowerCase());
    const matchStatus =
      selectedStatuses.length === 0 || selectedStatuses.includes(task.status);
    return matchText && matchStatus;
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreate();
    }
  };

  // ドラッグ終了時のハンドラ（型は any としています）
  const handleDragEnd = async (result: any) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    const taskToUpdate = filteredTasks.find((t) => t.id.toString() === draggableId);
    if (taskToUpdate) {
      await updateTask(taskToUpdate.id, {
        name: taskToUpdate.name,
        details: taskToUpdate.details,
        status: destination.droppableId as StatusType,
      });
      loadTasks();
    }
  };

  return (
    <div className="max-w-6xl mx-auto min-h-screen p-4">
      {/* ヘッダ */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">タスク一覧</h1>
      </div>

      {/* コントロールエリア */}
      <div className="mb-4 flex justify-between items-center">
        {/* 左側：ビュー切替 */}
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded ${
              viewMode === "table" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
            } transition-all duration-300`}
            onClick={() => setViewMode("table")}
          >
            テーブル
          </button>
          <button
            className={`px-3 py-1 rounded ${
              viewMode === "board" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
            } transition-all duration-300`}
            onClick={() => setViewMode("board")}
          >
            ボード
          </button>
        </div>
        {/* 右側：検索とステータス絞り込み */}
        <div className="flex gap-2 items-center">
          {showSearch ? (
            <div className="flex items-center gap-2">
              <input
                className="border px-2 py-1 text-sm text-gray-700 placeholder-gray-400 focus:shadow-lg transition-all duration-300"
                style={{ width: "220px" }}
                placeholder="検索（タスク名・詳細）"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              <button
                className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm transition-all duration-300 hover:bg-gray-300"
                onClick={() => setShowSearch(false)}
              >
                閉じる
              </button>
            </div>
          ) : (
            <button
              className="flex items-center bg-gray-200 text-gray-800 px-3 py-1 rounded transition-all duration-300 hover:bg-gray-300"
              onClick={() => setShowSearch(true)}
            >
              <span className="mr-1">🔍</span> 検索
            </button>
          )}
          <div className="relative">
            <button
              className="bg-gray-200 text-gray-800 px-3 py-1 rounded transition-all duration-300 hover:bg-gray-300"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              ステータス: {statusFilterLabel}
            </button>
            {showStatusDropdown && (
              <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg p-2">
                {ALL_STATUSES.map((status) => {
                  const checked = selectedStatuses.includes(status);
                  return (
                    <label
                      key={status}
                      className="flex items-center text-sm text-gray-700 cursor-pointer mb-1"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStatus(status)}
                        className="mr-2"
                      />
                      {status}
                    </label>
                  );
                })}
                <div className="flex justify-between mt-2">
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => setSelectedStatuses([])}
                  >
                    選択をクリア
                  </button>
                  <button
                    className="text-xs text-gray-600 hover:underline"
                    onClick={() => setShowStatusDropdown(false)}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 表示部分 */}
      {viewMode === "table" ? (
        <table className="table-auto w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">ステータス</th>
              <th className="px-4 py-2 text-left">最終更新日時</th>
              <th className="px-4 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr
                key={task.id}
                className="transition-all duration-300 hover:bg-gray-100 cursor-pointer"
                onClick={() => navigate(`/task/${task.id}?view=table`)}
              >
                <td className="px-4 py-2 border-b">{task.name}</td>
                <td className="px-4 py-2 border-b">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      handleStatusChange(task, e.target.value as StatusType)
                    }
                    className={`
                      inline-flex items-center px-3 py-1 rounded-full text-sm 
                      border border-transparent appearance-none pr-8
                      ${bubbleColorMap[task.status]}
                    `}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="未着手">● 未着手</option>
                    <option value="進行中">● 進行中</option>
                    <option value="完了">● 完了</option>
                  </select>
                </td>
                <td className="px-4 py-2 border-b">
                  {new Date(task.updated_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 border-b">
                  <button
                    className="bg-pink-200 text-pink-800 px-2 py-1 rounded text-sm transition-all duration-300 hover:bg-pink-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(task.id, e);
                    }}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {!editingNewTask ? (
              <tr
                className="transition-all duration-300 hover:bg-gray-100 cursor-pointer"
                onClick={() => setEditingNewTask(true)}
              >
                <td className="px-4 py-2 border-b text-pink-500 text-sm" colSpan={4}>
                  ＋ 新規タスクを追加
                </td>
              </tr>
            ) : (
              <tr className="transition-all duration-300 bg-gray-50">
                <td className="px-4 py-2 border-b">
                  <input
                    className="border p-1 text-sm w-40 placeholder-gray-400 text-gray-800 focus:shadow-lg"
                    placeholder="タスク名"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                </td>
                <td className="px-4 py-2 border-b" colSpan={2}>
                  <input
                    className="border p-1 text-sm w-60 placeholder-gray-400 text-gray-800 focus:shadow-lg"
                    placeholder="詳細"
                    value={newTaskDetails}
                    onChange={(e) => setNewTaskDetails(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </td>
                <td className="px-4 py-2 border-b">
                  <button
                    className="bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm transition-all duration-300 hover:bg-blue-300 mr-2"
                    onClick={handleCreate}
                  >
                    ✓
                  </button>
                  <button
                    className="bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm transition-all duration-300 hover:bg-gray-400"
                    onClick={() => {
                      setEditingNewTask(false);
                      setNewTaskName("");
                      setNewTaskDetails("");
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4">
            {ALL_STATUSES.map((status) => {
              const tasksInStatus = filteredTasks.filter((t) => t.status === status);
              return (
                <Droppable droppableId={status} key={status}>
                  {(provided: any, snapshot: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 min-w-[200px]"
                    >
                      <h2
                        className={`inline-block px-2 py-1 mb-2 font-bold rounded ${
                          bubbleColorMap[status]
                        }`}
                      >
                        {status}
                      </h2>
                      {tasksInStatus.map((task, index) => (
                        <Draggable draggableId={task.id.toString()} index={index} key={task.id}>
                          {(provided: any, snapshot: any) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-2 p-2 border border-gray-300 shadow-sm rounded text-sm cursor-pointer bg-white"
                              onClick={() => navigate(`/task/${task.id}?view=board`)}
                            >
                              {task.name}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}

export default TaskList;
