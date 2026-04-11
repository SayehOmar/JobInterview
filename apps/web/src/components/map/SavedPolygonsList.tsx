'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    closestCorners,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GET_MY_POLYGONS,
    GET_MY_POLYGON_FOLDERS,
    DELETE_POLYGON_MUTATION,
    CREATE_POLYGON_FOLDER,
    RENAME_POLYGON_FOLDER,
    DELETE_POLYGON_FOLDER,
    UPDATE_POLYGON_MUTATION,
    MOVE_POLYGON_TO_FOLDER,
    REORDER_ROOT_LIBRARY,
} from '@/graphql/polygons';
import { SavedLibraryRootKind } from '@/graphql/polygonEnums';
import {
    MapPin,
    Trash2,
    Trees,
    Clock,
    AlertCircle,
    Eye,
    FolderPlus,
    FolderOpen,
    Pencil,
    GripVertical,
    ChevronRight,
    ChevronDown,
} from 'lucide-react';
import {
    savedPolyPillBtn,
    savedPolyRoundBtnDanger,
    savedPolyRoundBtnMuted,
    savedPolyRoundBtnTeal,
} from './savedPolygonsUi';

type PolygonRow = {
    id: string;
    folderId?: string | null;
    rootOrder: number;
    folderOrder?: number | null;
    name: string;
    areaHectares: number;
    status: string;
    analysisResults?: { totalForestArea?: number } | null;
    geometry?: unknown;
    locationContext?: Record<string, unknown> | null;
};

type FolderRow = { id: string; name: string; rootOrder: number; createdAt: string };

interface SavedPolygonsListProps {
    onSelectPolygon: (polygon: PolygonRow) => void;
    onHighlightPolygon?: (polygon: PolygonRow) => void;
    selectedPolygonId?: string | null;
    showEmptyState?: boolean;
}

const PREFIX_F = 'root-f-';
const PREFIX_P = 'root-p-';
const PREFIX_PD = 'pd-';
const DROP_ROOT = 'library-root-canvas';

function idFolder(fid: string) {
    return `${PREFIX_F}${fid}`;
}
function idRootPoly(pid: string) {
    return `${PREFIX_P}${pid}`;
}
function idPolyDrag(pid: string) {
    return `${PREFIX_PD}${pid}`;
}
function dropInbox(fid: string) {
    return `inbox-${fid}`;
}

function mergeRootSorted(folders: FolderRow[], polygons: PolygonRow[]) {
    const roots = polygons.filter((p) => !p.folderId);
    type Entry =
        | { k: 'f'; o: number; f: FolderRow }
        | { k: 'p'; o: number; p: PolygonRow };
    const entries: Entry[] = [
        ...folders.map((f) => ({ k: 'f' as const, o: f.rootOrder, f })),
        ...roots.map((p) => ({ k: 'p' as const, o: p.rootOrder, p })),
    ];
    entries.sort((a, b) => a.o - b.o);
    return entries;
}

function parseReorderItems(rootIds: string[]): { kind: SavedLibraryRootKind; id: string }[] {
    return rootIds.map((rid) => {
        if (rid.startsWith(PREFIX_F)) {
            return { kind: SavedLibraryRootKind.FOLDER, id: rid.slice(PREFIX_F.length) };
        }
        if (rid.startsWith(PREFIX_P)) {
            return { kind: SavedLibraryRootKind.POLYGON, id: rid.slice(PREFIX_P.length) };
        }
        throw new Error(`Invalid root id ${rid}`);
    });
}

function PolygonBody({
    polygon,
    selected,
    editing,
    renameDraft,
    onRenameDraftChange,
    onRenameCommit,
    onRenameCancel,
    onStartRename,
    onSelect,
    onShowMap,
    onDelete,
    inputRef,
}: {
    polygon: PolygonRow;
    selected: boolean;
    editing: boolean;
    renameDraft: string;
    onRenameDraftChange: (v: string) => void;
    onRenameCommit: () => void;
    onRenameCancel: () => void;
    onStartRename: () => void;
    onSelect: () => void;
    onShowMap: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={() => !editing && onSelect()}
                className="min-w-0 flex-1 cursor-pointer py-3 pr-1 hover:bg-gray-50/80"
            >
                {editing ? (
                    <input
                        ref={inputRef ?? undefined}
                        value={renameDraft}
                        onChange={(e) => onRenameDraftChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                onRenameCommit();
                            }
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                onRenameCancel();
                            }
                        }}
                        onBlur={() => onRenameCommit()}
                        className="w-full rounded-md border border-[#0b4a59]/30 bg-white px-2 py-1 text-sm font-medium text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-[#0b4a59]/25"
                    />
                ) : (
                    <>
                        <h4 className="font-medium text-gray-900 truncate">{polygon.name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{polygon.areaHectares.toFixed(2)} ha</span>
                            <span className="flex items-center gap-1">
                                {polygon.status === 'completed' ? (
                                    <Trees size={12} className="text-green-600" />
                                ) : polygon.status === 'pending' ? (
                                    <Clock size={12} className="text-yellow-600" />
                                ) : (
                                    <AlertCircle size={12} className="text-red-600" />
                                )}
                                {polygon.status}
                            </span>
                        </div>
                        {polygon.analysisResults?.totalForestArea != null && (
                            <p className="text-xs text-green-600 mt-1">
                                Forest: {polygon.analysisResults.totalForestArea.toFixed(1)} ha
                            </p>
                        )}
                    </>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-1 pr-1 my-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onStartRename();
                    }}
                    className={savedPolyRoundBtnTeal}
                    title="Rename"
                >
                    <Pencil size={14} strokeWidth={2} />
                </button>
                <button type="button" onClick={(e) => onShowMap(e)} className={savedPolyRoundBtnTeal} title="Show on map">
                    <Eye size={15} strokeWidth={2} />
                </button>
                <button type="button" onClick={(e) => onDelete(e)} className={savedPolyRoundBtnDanger} title="Delete">
                    <Trash2 size={15} strokeWidth={2} />
                </button>
            </div>
        </>
    );
}

function NestedPolygonCard(
    props: Omit<Parameters<typeof PolygonBody>[0], 'inputRef'> & { inputRef?: React.RefObject<HTMLInputElement | null> },
) {
    const { polygon, inputRef, ...rest } = props;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: idPolyDrag(polygon.id),
        data: { polygon },
    });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-stretch gap-1.5 border-b border-gray-100 last:border-0 ${
                props.selected ? 'bg-green-50 border-l-4 border-green-500 pl-2' : ''
            } ${isDragging ? 'opacity-40' : ''}`}
        >
            <button
                type="button"
                className={`${savedPolyRoundBtnMuted} cursor-grab active:cursor-grabbing touch-none my-2`}
                aria-label="Drag on map list"
                {...listeners}
                {...attributes}
            >
                <GripVertical size={16} strokeWidth={2} />
            </button>
            <PolygonBody polygon={polygon} inputRef={inputRef} {...rest} />
        </div>
    );
}

function SortableRootPolygonCard(
    props: Omit<Parameters<typeof PolygonBody>[0], 'inputRef'> & {
        sortableId: string;
        inputRef: React.RefObject<HTMLInputElement | null>;
    },
) {
    const { sortableId, polygon, ...rest } = props;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
    };
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`group flex items-stretch gap-1.5 border-b border-gray-100 bg-white/90 ${
                props.selected ? 'bg-green-50 border-l-4 border-green-500 pl-2' : ''
            }`}
        >
            <button
                type="button"
                className={`${savedPolyRoundBtnMuted} cursor-grab active:cursor-grabbing touch-none my-2 shrink-0`}
                aria-label="Reorder or drag to folder"
                {...listeners}
            >
                <GripVertical size={16} strokeWidth={2} />
            </button>
            <PolygonBody polygon={polygon} {...rest} />
        </div>
    );
}

function FolderInbox({ folderId, children }: { folderId: string; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: dropInbox(folderId) });
    return (
        <div
            ref={setNodeRef}
            className={`min-h-[36px] divide-y divide-gray-50 ${isOver ? 'bg-amber-100/40 ring-1 ring-amber-300/60' : ''}`}
        >
            {children}
        </div>
    );
}

function RootCanvasDrop({ children }: { children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: DROP_ROOT });
    return (
        <div
            ref={setNodeRef}
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain text-sm ${isOver ? 'bg-green-50/30 ring-1 ring-green-300/50' : ''}`}
        >
            {children}
        </div>
    );
}

function SortableFolderBlock({
    folder,
    editingFolderId,
    folderRenameDraft,
    setFolderRenameDraft,
    commitFolderRename,
    cancelFolderRename,
    startFolderRename,
    expanded,
    toggleFolder,
    list,
    folderInputRef,
    onDeleteFolder,
    childrenPolygons,
}: {
    folder: FolderRow;
    editingFolderId: string | null;
    folderRenameDraft: string;
    setFolderRenameDraft: (s: string) => void;
    commitFolderRename: () => void;
    cancelFolderRename: () => void;
    startFolderRename: (f: FolderRow) => void;
    expanded: boolean;
    toggleFolder: (id: string) => void;
    list: PolygonRow[];
    folderInputRef: React.RefObject<HTMLInputElement | null>;
    onDeleteFolder: (f: FolderRow, e: React.MouseEvent) => void;
    childrenPolygons: React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: idFolder(folder.id),
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
    };
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="border-t border-gray-200 bg-white/95"
        >
            <div className="flex items-center gap-1.5 px-2 py-2 bg-amber-50/80 text-xs font-semibold text-amber-900/90">
                <button
                    type="button"
                    {...listeners}
                    className={`${savedPolyRoundBtnMuted} my-0 shrink-0 cursor-grab active:cursor-grabbing`}
                    aria-label="Reorder folder"
                >
                    <GripVertical size={16} strokeWidth={2} />
                </button>
                <button
                    type="button"
                    onClick={() => toggleFolder(folder.id)}
                    className={`${savedPolyRoundBtnMuted} my-0`}
                    aria-expanded={expanded}
                >
                    {expanded ? <ChevronDown size={16} strokeWidth={2} /> : <ChevronRight size={16} strokeWidth={2} />}
                </button>
                <div className="min-w-0 flex-1 flex items-center gap-2">
                    <FolderOpen size={14} className="shrink-0" />
                    {editingFolderId === folder.id ? (
                        <input
                            ref={folderInputRef}
                            value={folderRenameDraft}
                            onChange={(e) => setFolderRenameDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitFolderRename();
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelFolderRename();
                                }
                            }}
                            onBlur={() => commitFolderRename()}
                            className="w-full min-w-0 rounded-md border border-[#0b4a59]/30 bg-white px-2 py-1 text-sm font-semibold text-amber-950 shadow-sm outline-none focus:ring-2 focus:ring-[#0b4a59]/25"
                        />
                    ) : (
                        <button type="button" onClick={() => toggleFolder(folder.id)} className="truncate text-left min-w-0 flex-1">
                            {folder.name}
                            <span className="ml-1.5 font-normal text-amber-800/70">({list.length})</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => startFolderRename(folder)} className={savedPolyRoundBtnTeal} title="Rename folder">
                        <Pencil size={14} strokeWidth={2} />
                    </button>
                    <button type="button" onClick={(e) => onDeleteFolder(folder, e)} className={savedPolyRoundBtnDanger} title="Delete folder">
                        <Trash2 size={14} strokeWidth={2} />
                    </button>
                </div>
            </div>
            {expanded && <FolderInbox folderId={folder.id}>{childrenPolygons}</FolderInbox>}
            {!expanded && list.length > 0 && (
                <p className="px-3 py-1.5 text-[10px] text-amber-800/60 border-t border-amber-100/80">
                    {list.length} item{list.length === 1 ? '' : 's'} — expand or drop here
                </p>
            )}
        </div>
    );
}

export function SavedPolygonsList({
    onSelectPolygon,
    onHighlightPolygon,
    selectedPolygonId,
    showEmptyState = false,
}: SavedPolygonsListProps) {
    const { data: polyData, loading: polyLoading, refetch: refetchPolygons } = useQuery(GET_MY_POLYGONS);
    const { data: folderData, loading: folderLoading, refetch: refetchFolders } = useQuery(GET_MY_POLYGON_FOLDERS);

    const [deletePolygon] = useMutation(DELETE_POLYGON_MUTATION);
    const [createFolder] = useMutation(CREATE_POLYGON_FOLDER);
    const [renameFolderMut] = useMutation(RENAME_POLYGON_FOLDER);
    const [deleteFolderMut] = useMutation(DELETE_POLYGON_FOLDER);
    const [updatePolygon] = useMutation(UPDATE_POLYGON_MUTATION);
    const [movePolygon] = useMutation(MOVE_POLYGON_TO_FOLDER);
    const [reorderRoot] = useMutation(REORDER_ROOT_LIBRARY);

    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [activeDrag, setActiveDrag] = useState<PolygonRow | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [editingPolygonId, setEditingPolygonId] = useState<string | null>(null);
    const [polygonRenameDraft, setPolygonRenameDraft] = useState('');
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [folderRenameDraft, setFolderRenameDraft] = useState('');
    const folderInputRef = useRef<HTMLInputElement>(null);
    const polyInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingFolderId && folderInputRef.current) {
            folderInputRef.current.focus();
            folderInputRef.current.select();
        }
    }, [editingFolderId]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const polygons: PolygonRow[] =
        (polyData as { myPolygons?: PolygonRow[] } | undefined)?.myPolygons?.map((p) => ({
            ...p,
            rootOrder: p.rootOrder ?? 0,
            folderOrder: p.folderOrder ?? null,
        })) ?? [];
    const folders: FolderRow[] =
        (folderData as { myPolygonFolders?: FolderRow[] } | undefined)?.myPolygonFolders?.map((f) => ({
            ...f,
            rootOrder: f.rootOrder ?? 0,
        })) ?? [];

    const byFolder = useMemo(() => {
        const m = new Map<string, PolygonRow[]>();
        for (const f of folders) m.set(f.id, []);
        for (const p of polygons) {
            if (!p.folderId) continue;
            if (!m.has(p.folderId)) m.set(p.folderId, []);
            m.get(p.folderId)!.push(p);
        }
        for (const [, arr] of m) {
            arr.sort((a, b) => (a.folderOrder ?? 0) - (b.folderOrder ?? 0));
        }
        return m;
    }, [polygons, folders]);

    const rootEntries = useMemo(() => mergeRootSorted(folders, polygons), [folders, polygons]);
    const rootIds = useMemo(
        () =>
            rootEntries.map((e) => (e.k === 'f' ? idFolder(e.f.id) : idRootPoly(e.p.id))),
        [rootEntries],
    );

    const refetchAll = async () => {
        await refetchPolygons();
        await refetchFolders();
    };

    const toggleFolder = (folderId: string) => {
        setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
    };
    const isFolderExpanded = (folderId: string) => expandedFolders[folderId] === true;

    const handleDragStart = (e: DragStartEvent) => {
        const aid = String(e.active.id);
        if (aid.startsWith(PREFIX_PD)) {
            const id = aid.slice(PREFIX_PD.length);
            const p = polygons.find((x) => x.id === id);
            if (p) setActiveDrag(p);
        } else if (aid.startsWith(PREFIX_P)) {
            const id = aid.slice(PREFIX_P.length);
            const p = polygons.find((x) => x.id === id);
            if (p) setActiveDrag(p);
        }
    };

    const handleDragEnd = async (e: DragEndEvent) => {
        setActiveDrag(null);
        const { active, over } = e;
        if (!over) return;
        const aid = String(active.id);
        const oid = String(over.id);

        if (aid.startsWith(PREFIX_PD) && oid === DROP_ROOT) {
            const pid = aid.slice(PREFIX_PD.length);
            try {
                await movePolygon({ variables: { polygonId: pid, folderId: null } });
                await refetchPolygons();
            } catch (err) {
                console.error(err);
            }
            return;
        }
        if (aid.startsWith(PREFIX_PD) && oid.startsWith('inbox-')) {
            const pid = aid.slice(PREFIX_PD.length);
            const fid = oid.replace('inbox-', '');
            try {
                await movePolygon({ variables: { polygonId: pid, folderId: fid } });
                await refetchPolygons();
            } catch (err) {
                console.error(err);
            }
            return;
        }
        if (aid.startsWith(PREFIX_P) && oid.startsWith('inbox-')) {
            const pid = aid.slice(PREFIX_P.length);
            const fid = oid.replace('inbox-', '');
            try {
                await movePolygon({ variables: { polygonId: pid, folderId: fid } });
                await refetchPolygons();
            } catch (err) {
                console.error(err);
            }
            return;
        }

        if (
            (aid.startsWith(PREFIX_P) || aid.startsWith(PREFIX_F)) &&
            (oid.startsWith(PREFIX_P) || oid.startsWith(PREFIX_F)) &&
            aid !== oid
        ) {
            const oldIndex = rootIds.indexOf(aid);
            const newIndex = rootIds.indexOf(oid);
            if (oldIndex < 0 || newIndex < 0) return;
            const next = arrayMove([...rootIds], oldIndex, newIndex);
            try {
                await reorderRoot({
                    variables: { input: { items: parseReorderItems(next) } },
                });
                await refetchAll();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const startPolygonRename = (p: PolygonRow) => {
        setEditingPolygonId(p.id);
        setPolygonRenameDraft(p.name);
    };
    const commitPolygonRename = async () => {
        const id = editingPolygonId;
        if (!id) return;
        const p = polygons.find((x) => x.id === id);
        const next = polygonRenameDraft.trim();
        setEditingPolygonId(null);
        if (!p || !next || next === p.name) return;
        try {
            await updatePolygon({ variables: { input: { polygonId: p.id, name: next } } });
            refetchPolygons();
        } catch (err) {
            console.error(err);
        }
    };
    const cancelPolygonRename = () => setEditingPolygonId(null);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deletePolygon({ variables: { polygonId: id } });
            refetchPolygons();
        } catch (err) {
            console.error(err);
        }
    };

    const handleShowOnMap = (polygon: PolygonRow, e: React.MouseEvent) => {
        e.stopPropagation();
        onHighlightPolygon?.(polygon);
    };

    const handleCreateFolder = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            const res = await createFolder({ variables: { input: { name: newFolderName.trim() } } });
            setNewFolderName('');
            setShowNewFolder(false);
            await refetchAll();
            const created = (res.data as { createPolygonFolder?: { id: string } })?.createPolygonFolder;
            if (created?.id) setExpandedFolders((prev) => ({ ...prev, [created.id]: true }));
        } catch (err) {
            console.error(err);
        }
    };

    const startFolderRename = (folder: FolderRow) => {
        setEditingFolderId(folder.id);
        setFolderRenameDraft(folder.name);
    };
    const commitFolderRename = async () => {
        const fid = editingFolderId;
        if (!fid) return;
        const folder = folders.find((f) => f.id === fid);
        const next = folderRenameDraft.trim();
        setEditingFolderId(null);
        if (!folder || !next || next === folder.name) return;
        try {
            await renameFolderMut({ variables: { input: { folderId: fid, name: next } } });
            refetchFolders();
        } catch (err) {
            console.error(err);
        }
    };
    const cancelFolderRename = () => setEditingFolderId(null);

    const handleDeleteFolder = async (folder: FolderRow, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteFolderMut({ variables: { folderId: folder.id } });
            refetchAll();
        } catch (err) {
            console.error(err);
        }
    };

    const loading = (polyLoading && !polyData) || (folderLoading && !folderData);

    if (loading) {
        return (
            <div className="relative w-full rounded-xl border border-gray-200 bg-white p-4 shadow-md">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded" />
                </div>
            </div>
        );
    }

    if (polygons.length === 0 && !showEmptyState) return null;

    if (polygons.length === 0) {
        return (
            <div className="relative flex min-h-[168px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
                <div className="flex flex-1 flex-col items-center justify-center px-3 py-6 text-center text-gray-500">
                    <MapPin size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No saved polygons yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Saved areas appear here after you save a draw.</p>
                </div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
                <div className="p-3 bg-gray-50 border-b border-gray-200 sticky top-0 z-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2 min-w-0">
                            <Trees size={18} className="text-green-600 shrink-0" />
                            <span className="truncate">Saved ({polygons.length})</span>
                        </h3>
                        <button type="button" onClick={() => setShowNewFolder((v) => !v)} className={savedPolyPillBtn}>
                            <FolderPlus size={14} strokeWidth={2} />
                            <span className="hidden sm:inline">Folder</span>
                        </button>
                    </div>
                    {showNewFolder && (
                        <form onSubmit={handleCreateFolder} className="flex gap-2">
                            <input
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Folder name"
                                className="flex-1 min-w-0 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#0b4a59]/25"
                            />
                            <button
                                type="submit"
                                className="rounded-full border border-[#0b4a59]/30 bg-[#0b4a59] px-4 py-2 text-sm font-medium text-white shadow-md transition hover:opacity-95 active:scale-[0.98]"
                            >
                                Add
                            </button>
                        </form>
                    )}
                    <p className="text-[10px] text-gray-500">
                        Drag items in the list to reorder. Drag a polygon onto a folder block to nest it, or onto the list
                        (highlighted) to move it to the top level — same as the map sidebar canvas.
                    </p>
                </div>

                <RootCanvasDrop>
                    <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
                        {rootEntries.map((entry) =>
                            entry.k === 'f' ? (
                                <SortableFolderBlock
                                    key={entry.f.id}
                                    folder={entry.f}
                                    editingFolderId={editingFolderId}
                                    folderRenameDraft={folderRenameDraft}
                                    setFolderRenameDraft={setFolderRenameDraft}
                                    commitFolderRename={commitFolderRename}
                                    cancelFolderRename={cancelFolderRename}
                                    startFolderRename={startFolderRename}
                                    expanded={isFolderExpanded(entry.f.id)}
                                    toggleFolder={toggleFolder}
                                    list={byFolder.get(entry.f.id) ?? []}
                                    folderInputRef={folderInputRef}
                                    onDeleteFolder={handleDeleteFolder}
                                    childrenPolygons={(byFolder.get(entry.f.id) ?? []).map((polygon) => (
                                        <NestedPolygonCard
                                            key={polygon.id}
                                            polygon={polygon}
                                            selected={selectedPolygonId === polygon.id}
                                            editing={editingPolygonId === polygon.id}
                                            renameDraft={polygonRenameDraft}
                                            onRenameDraftChange={setPolygonRenameDraft}
                                            onRenameCommit={commitPolygonRename}
                                            onRenameCancel={cancelPolygonRename}
                                            onStartRename={() => startPolygonRename(polygon)}
                                            onSelect={() => onSelectPolygon(polygon)}
                                            onShowMap={(e) => handleShowOnMap(polygon, e)}
                                            onDelete={(e) => handleDelete(polygon.id, e)}
                                            inputRef={polyInputRef}
                                        />
                                    ))}
                                />
                            ) : (
                                <SortableRootPolygonCard
                                    key={entry.p.id}
                                    sortableId={idRootPoly(entry.p.id)}
                                    polygon={entry.p}
                                    selected={selectedPolygonId === entry.p.id}
                                    editing={editingPolygonId === entry.p.id}
                                    renameDraft={polygonRenameDraft}
                                    onRenameDraftChange={setPolygonRenameDraft}
                                    onRenameCommit={commitPolygonRename}
                                    onRenameCancel={cancelPolygonRename}
                                    onStartRename={() => startPolygonRename(entry.p)}
                                    onSelect={() => onSelectPolygon(entry.p)}
                                    onShowMap={(e) => handleShowOnMap(entry.p, e)}
                                    onDelete={(e) => handleDelete(entry.p.id, e)}
                                    inputRef={polyInputRef}
                                />
                            ),
                        )}
                    </SortableContext>
                </RootCanvasDrop>
            </div>

            <DragOverlay dropAnimation={null}>
                {activeDrag ? (
                    <div className="rounded-full border border-gray-200 bg-white px-4 py-2 shadow-lg text-sm font-medium max-w-[220px] truncate">
                        {activeDrag.name}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
