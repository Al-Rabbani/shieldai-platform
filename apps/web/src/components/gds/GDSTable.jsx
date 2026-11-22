import React from "react";

const CARD   = "#0f1623";
const CARD2  = "#111827";
const BORDER = "#1a1f2e";

export default function GDSTable({ columns, rows, isLoading, emptyText, onRowClick, skeletonRows = 4 }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: "#080c14", borderBottom: `1px solid ${BORDER}` }}>
              {columns.map((c, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(skeletonRows)].map((_, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? CARD : CARD2, borderBottom: `1px solid ${BORDER}40` }}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)", width: `${60 + (j * 13) % 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <p className="text-sm text-slate-500">{emptyText || "No data found"}</p>
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row._key ?? i}
                  style={{ background: i % 2 === 0 ? CARD : CARD2, borderBottom: `1px solid ${BORDER}40` }}
                  className={onRowClick ? "cursor-pointer hover:brightness-110 transition-all" : ""}
                  onClick={() => onRowClick?.(row._data)}>
                  {row._cells.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5 text-[11px]">{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}