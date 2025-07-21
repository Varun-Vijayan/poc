'use client';

interface WorkflowBuilderToolbarProps {
  onSave: () => void;
  onExecute: () => void;
  onClear: () => void;
  onToggleLibrary: () => void;
  onDeleteSelected: () => void;
  hasSelectedNode: boolean;
  nodeCount: number;
}

export default function WorkflowBuilderToolbar({
  onSave,
  onExecute,
  onClear,
  onToggleLibrary,
  onDeleteSelected,
  hasSelectedNode,
  nodeCount
}: WorkflowBuilderToolbarProps) {
  return (
    <div className="flex items-center space-x-2">
      {/* Library Toggle */}
      <button
        onClick={onToggleLibrary}
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        title="Toggle Block Library"
      >
        📦 Library
      </button>

      {/* Delete Selected */}
      <button
        onClick={onDeleteSelected}
        disabled={!hasSelectedNode}
        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          hasSelectedNode
            ? 'text-red-700 bg-red-50 border border-red-300 hover:bg-red-100'
            : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
        }`}
        title="Delete Selected Node"
      >
        🗑️ Delete
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />

      {/* Save */}
      <button
        onClick={onSave}
        disabled={nodeCount === 0}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          nodeCount > 0
            ? 'text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100'
            : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
        }`}
        title="Save Workflow"
      >
        💾 Save
      </button>

      {/* Execute */}
      <button
        onClick={onExecute}
        disabled={nodeCount === 0}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          nodeCount > 0
            ? 'text-green-700 bg-green-50 border border-green-300 hover:bg-green-100'
            : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
        }`}
        title="Execute Workflow"
      >
        ▶️ Execute
      </button>

      {/* Clear */}
      <button
        onClick={onClear}
        className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200"
        title="Clear Workflow"
      >
        🧹 Clear
      </button>
    </div>
  );
} 