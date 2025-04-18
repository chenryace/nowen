import { useCallback, useState } from 'react';
import { createContainer } from 'unstated-next';
import NoteTreeState from 'libs/web/state/tree';
import { NOTE_DELETED, NOTE_PINNED, NOTE_SHARED } from 'libs/shared/meta';
import useNoteAPI from '../api/note';
import noteCache from '../cache/note';
import { NoteModel } from 'libs/shared/note';
import { useToast } from '../hooks/use-toast';
import { isEmpty, map } from 'lodash';

const useNote = (initData?: NoteModel) => {
    const [note, setNote] = useState<NoteModel | undefined>(initData);
    const { find, abort: abortFindNote } = useNoteAPI();
    const { create, error: createError } = useNoteAPI();
    const { mutate, loading, abort } = useNoteAPI();
    const { addItem, removeItem, mutateItem, genNewId } =
        NoteTreeState.useContainer();
    const toast = useToast();
    // 添加状态跟踪未保存的更改
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    // 添加状态存储待保存的内容
    const [pendingChanges, setPendingChanges] = useState<Partial<NoteModel>>({});

    const fetchNote = useCallback(
        async (id: string) => {
            const cache = await noteCache.getItem(id);
            if (cache) {
                setNote(cache);
            }
            const result = await find(id);

            if (!result) {
                return;
            }

            result.content = result.content || '\n';
            setNote(result);
            await noteCache.setItem(id, result);

            return result;
        },
        [find]
    );

    const removeNote = useCallback(
        async (id: string) => {
            const payload = {
                deleted: NOTE_DELETED.DELETED,
            };

            setNote((prev) => {
                if (prev?.id === id) {
                    return { ...prev, ...payload };
                }
                return prev;
            });
            await mutate(id, payload);
            await noteCache.mutateItem(id, payload);
            await removeItem(id);
        },
        [mutate, removeItem]
    );

    const mutateNote = useCallback(
        async (id: string, payload: Partial<NoteModel>) => {
            const note = await noteCache.getItem(id);

            if (!note) {
                // todo
                console.error('mutate note error');
                return;
            }

            const diff: Partial<NoteModel> = {};
            map(payload, (value: any, key: keyof NoteModel) => {
                if (note[key] !== value) {
                    diff[key] = value;
                }
            });

            if (isEmpty(diff)) {
                return;
            }

            setNote((prev) => {
                if (prev?.id === id) {
                    return { ...prev, ...payload };
                }
                return prev;
            });
            await mutate(id, payload);
            await noteCache.mutateItem(id, payload);
            await mutateItem(id, {
                data: {
                    ...note,
                    ...payload,
                },
            });
        },
        [mutate, mutateItem]
    );

    const createNote = useCallback(
        async (body: Partial<NoteModel>) => {
            const result = await create(body);

            if (!result) {
                toast(createError, 'error');
                return;
            }

            result.content = result.content || '\n';
            await noteCache.setItem(result.id, result);
            setNote(result);
            addItem(result);

            return result;
        },
        [create, addItem, toast, createError]
    );

    const createNoteWithTitle = useCallback(
        async (title: NoteModel['title']) => {
            const id = genNewId();
            const result = await create({
                id,
                title,
            });

            if (!result) {
                return;
            }

            result.content = result.content || '\n';
            await noteCache.setItem(result.id, result);
            addItem(result);

            return { id };
        },
        [addItem, create, genNewId]
    );

    // 删除这个原始的updateNote函数
    /**
     * TODO: merge with mutateNote
     */
    /* 删除这个函数
    const updateNote = useCallback(
        async (data: Partial<NoteModel>) => {
            abort();

            if (!note?.id) {
                toast('Not found id', 'error');
                return;
            }
            const newNote = {
                ...note,
                ...data,
            };
            delete newNote.content;
            setNote(newNote);
            await mutateItem(newNote.id, {
                data: newNote,
            });
            await mutate(note.id, data);
            await noteCache.mutateItem(note.id, data);
        },
        [abort, toast, note, mutate, mutateItem]
    );
    */

    const initNote = useCallback((note: Partial<NoteModel>) => {
        setNote({
            deleted: NOTE_DELETED.NORMAL,
            shared: NOTE_SHARED.PRIVATE,
            pinned: NOTE_PINNED.UNPINNED,
            editorsize: null,
            id: '-1',
            title: '',
            ...note,
        });
    }, []);

    const findOrCreateNote = useCallback(
        async (id: string, note: Partial<NoteModel>) => {
            try {
                const data = await fetchNote(id);
                if (!data) {
                    throw data;
                }
            } catch (e) {
                await createNote({
                    id,
                    ...note,
                });
            }
        },
        [createNote, fetchNote]
    );

    // 修改updateNote函数，只更新本地状态而不发送API请求
    const updateNote = useCallback(
        (payload: Partial<NoteModel>) => {
            if (!note?.id) {
                return;
            }

            // 更新本地状态
            setNote((prev) => {
                if (prev) {
                    return { ...prev, ...payload };
                }
                return prev;
            });

            // 记录待保存的更改
            setPendingChanges((prev) => ({
                ...prev,
                ...payload,
            }));
            
            // 标记有未保存的更改
            setHasUnsavedChanges(true);
        },
        [note?.id]
    );

    // 添加手动保存函数
    const saveNote = useCallback(async () => {
        if (!note?.id || !hasUnsavedChanges || isEmpty(pendingChanges)) {
            return;
        }

        try {
            // 调用API保存笔记
            await mutate(note.id, pendingChanges);
            
            // 更新缓存
            await noteCache.mutateItem(note.id, pendingChanges);
            
            // 更新树状态（如果标题变更）
            if (pendingChanges.title) {
                mutateItem(note.id, { title: pendingChanges.title });
            }
            
            // 重置未保存状态
            setHasUnsavedChanges(false);
            setPendingChanges({});
            
            toast('保存成功');
        } catch (error) {
            toast('保存失败', 'error');
            console.error('Failed to save note:', error);
        }
    }, [note?.id, hasUnsavedChanges, pendingChanges, mutate, mutateItem, toast]);

    return {
        note,
        fetchNote,
        abortFindNote,
        findOrCreateNote,
        initNote,
        createNote,
        createError,
        updateNote,
        mutateNote,
        loading,
        abort,
        saveNote,           
        hasUnsavedChanges,  
        removeNote,         
        createNoteWithTitle, // Add this line to export the createNoteWithTitle function
    };
};

export default createContainer(useNote);
