import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { Branch, InventoryItem } from '../../../types';
import {
  X,
  Store,
  MapPin,
  Phone,
  Mail,
  Clock,
  User,
  Users,
  Shield,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  Key,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  ExternalLink,
  Edit,
  History,
  Sparkles,
} from 'lucide-react';

interface BranchDetailsDrawerProps {
  branch: Branch | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAccounts: () => void;
  onOpenStatus: () => void;
  onOpenAudit: () => void;
}

export const BranchDetailsDrawer: React.FC<BranchDetailsDrawerProps> = ({
  branch,
  isOpen,
  onClose,
  onOpenAccounts,
  onOpenStatus,
  onOpenAudit,
}) => {
  const {
    branchRevenue,
    branchStockCount,
    demandForecastForBranch,
    restockSuggestionsForBranch,
    getInventoryForBranch,
    getOrdersForBranch,
    getBranchDocuments,
    getBranchAccounts,
    updateStock,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'documents' | 'staff' | 'orders'>('overview');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);

  if (!isOpen || !branch) return null;

  const revenue = branchRevenue(branch.id);
  const totalStock = branchStockCount(branch.id);
  const forecast = demandForecastForBranch(branch.id);
  const restockSuggestions = restockSuggestionsForBranch(branch.id);
  const inventory = getInventoryForBranch(branch.id);
  const orders = getOrdersForBranch(branch.id);
  const documents = getBranchDocuments(branch.id);
  const accounts = getBranchAccounts(branch.id);

  const status = branch.status || 'Active';

  const handleStockSave = (item: InventoryItem) => {
    updateStock(item.id, newStockValue);
    setEditingStockId(null);
  };

  return (
    <div
      id="branch-details-drawer-overlay"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="branch-details-drawer-panel"
        className={`w-full max-w-2xl h-full shadow-2xl border-l flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 ${
          isDark ? 'bg-[#121212] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Drawer Header */}
        <div
          className={`p-6 border-b space-y-4 ${
            isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F37021]/15 text-[#F37021] flex items-center justify-center font-bold">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-black tracking-tight">{branch.name}</h2>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      status === 'Active'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : status === 'Suspended'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-neutral-400 mt-1 font-mono">
                  <span>{branch.code || branch.id}</span>
                  <span>•</span>
                  <span>{branch.businessType || 'Mall Kiosk'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Operational Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={onOpenAccounts}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 flex items-center space-x-1.5 transition-all"
            >
              <Users className="w-3.5 h-3.5 text-[#80C7F2]" />
              <span>Staff Accounts ({accounts.length})</span>
            </button>

            <button
              onClick={onOpenStatus}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 flex items-center space-x-1.5 transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Lifecycle & Status</span>
            </button>

            <button
              onClick={onOpenAudit}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 flex items-center space-x-1.5 transition-all"
            >
              <History className="w-3.5 h-3.5 text-neutral-400" />
              <span>Audit Trail</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-neutral-800 space-x-4 pt-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'text-[#F37021] border-b-2 border-[#F37021]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`pb-2 text-xs font-bold transition-all ${
                activeTab === 'inventory'
                  ? 'text-[#F37021] border-b-2 border-[#F37021]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Live Inventory ({totalStock})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-2 text-xs font-bold transition-all ${
                activeTab === 'documents'
                  ? 'text-[#F37021] border-b-2 border-[#F37021]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Permits & Docs ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`pb-2 text-xs font-bold transition-all ${
                activeTab === 'staff'
                  ? 'text-[#F37021] border-b-2 border-[#F37021]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Staff Logins ({accounts.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-2 text-xs font-bold transition-all ${
                activeTab === 'orders'
                  ? 'text-[#F37021] border-b-2 border-[#F37021]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Requisitions ({orders.length})
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div
                  className={`p-3.5 rounded-xl border ${
                    isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Gross Sales Revenue</span>
                  <div className="text-lg font-black text-emerald-400 mt-1">₱{revenue.toLocaleString()}</div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Total Stock On-Hand</span>
                  <div className="text-lg font-black text-[#80C7F2] mt-1">{totalStock} units</div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border col-span-2 sm:col-span-1 ${
                    isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Velocity Forecast</span>
                  <div className="text-xs font-bold text-[#F37021] mt-1">{forecast}</div>
                </div>
              </div>

              {/* Location & Store Info */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex items-center space-x-2 text-[#80C7F2] pb-2 border-b border-neutral-800">
                  <MapPin className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Store Location & Operations</h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <span className="text-neutral-500">Physical Address:</span>
                    <span className="font-semibold text-right max-w-[280px]">{branch.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Contact Number:</span>
                    <span className="font-semibold">{branch.contactNumber || '+63 917 123 4567'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Official Email:</span>
                    <span className="font-semibold">{branch.email || `${branch.id}@marshbites.com`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Operating Schedule:</span>
                    <span className="font-semibold">{branch.operatingHours || '10:00 AM - 9:00 PM (Mall Hours)'}</span>
                  </div>
                </div>
              </div>

              {/* Branch Manager Card */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex items-center space-x-2 text-[#F37021] pb-2 border-b border-neutral-800">
                  <User className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Designated Branch Manager</h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Manager Name:</span>
                    <span className="font-semibold">{branch.managerName || `${branch.name} Manager`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Mobile Contact:</span>
                    <span className="font-semibold">{branch.managerPhone || '+63 917 555 0100'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Government ID:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {branch.managerGovId || 'SSS-04-1234567-8'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Restock Recommendations Alert */}
              {restockSuggestions.length > 0 && (
                <div className="p-4 rounded-xl bg-[#F37021]/10 border border-[#F37021]/30 space-y-2">
                  <div className="flex items-center space-x-2 text-[#F37021] font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>Predictive Restock Alert ({restockSuggestions.length} SKUs below safety stock)</span>
                  </div>
                  <div className="space-y-1">
                    {restockSuggestions.map((s, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-neutral-300">
                        <span>{s.productName}</span>
                        <span className="font-bold text-[#F37021]">Order +{s.suggestedOrderQuantity} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-3">
              {inventory.map((item) => {
                const isEditing = editingStockId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold">{item.productName}</h4>
                      <p className="text-[11px] text-neutral-400 mt-0.5">SKU ID: {item.productId}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            value={newStockValue}
                            onChange={(e) => setNewStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-16 px-2 py-1 text-xs rounded bg-neutral-900 border border-neutral-700 text-white font-bold"
                          />
                          <button
                            onClick={() => handleStockSave(item)}
                            className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm font-black ${
                              item.stock < 15 ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {item.stock} units
                          </span>
                          <button
                            onClick={() => {
                              setEditingStockId(item.id);
                              setNewStockValue(item.stock);
                            }}
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="p-8 text-center border rounded-xl border-neutral-800 text-neutral-500 text-xs">
                  No verified compliance documents on record for this branch.
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-[#80C7F2]/15 text-[#80C7F2] flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">{doc.title}</h4>
                        <p className="text-[11px] text-neutral-500 font-mono">
                          {doc.fileName} • {doc.fileSize || '1.5 MB'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        doc.status === 'verified'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: STAFF */}
          {activeTab === 'staff' && (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold">{acc.fullName}</h4>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-neutral-800 text-[#80C7F2] font-semibold">
                        {acc.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{acc.email}</p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      acc.isActive ? 'text-emerald-400 bg-emerald-500/15' : 'text-red-400 bg-red-500/15'
                    }`}
                  >
                    {acc.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="p-8 text-center border rounded-xl border-neutral-800 text-neutral-500 text-xs">
                  No orders recorded for this store.
                </div>
              ) : (
                orders.map((ord) => (
                  <div
                    key={ord.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold font-mono text-[#80C7F2]">{ord.id}</span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                            ord.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : ord.status === 'rejected'
                              ? 'bg-red-500/15 text-red-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {new Date(ord.createdAt).toLocaleDateString()} • {ord.items.length} items
                      </p>
                    </div>
                    <div className="text-xs font-black text-white">₱{ord.totalAmount.toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div
          className={`p-4 border-t flex justify-end ${
            isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
