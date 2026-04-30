'use client';

import { useState } from 'react';
import { CheckSquare, Square, MoreVertical, Trash2, Edit, Download, Mail, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

interface BulkActionsProps<T> {
  items: T[];
  selectedItems: Set<string>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkUpdate?: (ids: string[], updates: Partial<T>) => Promise<void>;
  onBulkEditGrade?: (ids: string[]) => void;
  onBulkExport?: (ids: string[]) => void;
  onBulkPrintQR?: (ids: string[]) => void;
  onBulkMessage?: (ids: string[]) => void;
  getId: (item: T) => string;
  getLabel?: (item: T) => string;
}

export default function BulkActions<T>({
  items,
  selectedItems,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkUpdate,
  onBulkEditGrade,
  onBulkExport,
  onBulkPrintQR,
  onBulkMessage,
  getId,
  getLabel,
}: BulkActionsProps<T>) {
  const [showMenu, setShowMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedCount = selectedItems.size;
  const allSelected = selectedCount === items.length && items.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < items.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedCount === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedCount} item(s)?`)) {
      return;
    }

    try {
      setIsProcessing(true);
      const ids = Array.from(selectedItems);
      await onBulkDelete(ids);
      toast.success(`Successfully deleted ${selectedCount} item(s)`);
      onDeselectAll();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete items');
    } finally {
      setIsProcessing(false);
      setShowMenu(false);
    }
  };

  const handleBulkExport = () => {
    if (!onBulkExport || selectedCount === 0) return;
    const ids = Array.from(selectedItems);
    onBulkExport(ids);
    setShowMenu(false);
  };

  const handleBulkPrintQR = () => {
    if (!onBulkPrintQR || selectedCount === 0) return;
    const ids = Array.from(selectedItems);
    onBulkPrintQR(ids);
    setShowMenu(false);
  };

  const handleBulkMessage = () => {
    if (!onBulkMessage || selectedCount === 0) return;
    const ids = Array.from(selectedItems);
    onBulkMessage(ids);
    setShowMenu(false);
  };

  if (selectedCount === 0 && !allSelected && !someSelected) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={handleSelectAll}
          className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] rounded-lg transition-colors"
        >
          <Square size={18} />
          Select All
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary-dark)]"
            disabled={isProcessing}
          >
            {allSelected ? <CheckSquare size={18} className="text-[var(--primary)]" /> : <Square size={18} />}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-sm text-[var(--muted-foreground)]">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center gap-2 relative">
          {onBulkExport && (
            <button
              onClick={handleBulkExport}
              disabled={isProcessing || selectedCount === 0}
              className="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors disabled:opacity-50 flex items-center gap-2 text-[var(--foreground)]"
            >
              <Download size={16} />
              Export
            </button>
          )}
          {onBulkPrintQR && (
            <button
              onClick={handleBulkPrintQR}
              disabled={isProcessing || selectedCount === 0}
              className="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors disabled:opacity-50 flex items-center gap-2 text-[var(--foreground)]"
            >
              <QrCode size={16} />
              Print QR
            </button>
          )}
          {onBulkMessage && (
            <button
              onClick={handleBulkMessage}
              disabled={isProcessing || selectedCount === 0}
              className="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors disabled:opacity-50 flex items-center gap-2 text-[var(--foreground)]"
            >
              <Mail size={16} />
              Message
            </button>
          )}

          {(onBulkDelete || onBulkUpdate || onBulkEditGrade) && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                disabled={isProcessing || selectedCount === 0}
                className="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors disabled:opacity-50 flex items-center gap-2 text-[var(--foreground)]"
              >
                <MoreVertical size={16} />
                Actions
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--surface)] rounded-lg shadow-lg border border-[var(--border)] z-20">
                    {onBulkEditGrade && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onBulkEditGrade(Array.from(selectedItems));
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] flex items-center gap-2"
                      >
                        <Edit size={16} />
                        Edit grade / section / shift
                      </button>
                    )}
                    {onBulkUpdate && !onBulkEditGrade && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          toast.success('Bulk update feature coming soon');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] flex items-center gap-2"
                      >
                        <Edit size={16} />
                        Update Status
                      </button>
                    )}
                    {onBulkDelete && (
                      <button
                        onClick={handleBulkDelete}
                        disabled={isProcessing}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--destructive)] hover:bg-red-50/80 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                        Delete Selected
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={onDeselectAll}
            className="px-3 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
