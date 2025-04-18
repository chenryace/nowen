import NoteState from 'libs/web/state/note';
import { has } from 'lodash';
import router, { useRouter } from 'next/router';
import { useCallback, useEffect } from 'react';
import NoteTreeState from 'libs/web/state/tree';
import NoteNav from 'components/note-nav';  // 保留这个导入
import UIState from 'libs/web/state/ui';
import noteCache from 'libs/web/cache/note';
import useSettingsAPI from 'libs/web/api/settings';
import dynamic from 'next/dynamic';
import { useToast } from 'libs/web/hooks/use-toast';
import DeleteAlert from 'components/editor/delete-alert';
// 导入保存按钮组件
import SaveButton from 'components/editor/save-button';

const MainEditor = dynamic(() => import('components/editor/main-editor'));

export const EditContainer = () => {
    const {
        title: { updateTitle },
        settings: { settings },
    } = UIState.useContainer();
    const { genNewId } = NoteTreeState.useContainer();
    const { fetchNote, abortFindNote, findOrCreateNote, initNote, note, saveNote, hasUnsavedChanges } =
        NoteState.useContainer();
    const { query } = useRouter();
    const pid = query.pid as string;
    const id = query.id as string;
    const isNew = has(query, 'new');
    const { mutate: mutateSettings } = useSettingsAPI();
    const toast = useToast();

    const loadNoteById = useCallback(
        async (id: string) => {
            // daily notes
            if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(id)) {
                await findOrCreateNote(id, {
                    id,
                    title: id,
                    content: '\n',
                    pid: settings.daily_root_id,
                });
            } else if (id === 'new') {
                const url = `/${genNewId()}?new` + (pid ? `&pid=${pid}` : '');

                await router.replace(url, undefined, { shallow: true });
            } else if (id && !isNew) {
                try {
                    const result = await fetchNote(id);
                    if (!result) {
                        await router.replace({ query: { ...router.query, new: 1 } });
                        return;
                    }
                } catch (msg) {
                    const err = msg as Error;
                    if (err.name !== 'AbortError') {
                        toast(err.message, 'error');
                        await router.push('/', undefined, { shallow: true });
                    }
                }
            } else {
                if (await noteCache.getItem(id)) {
                    await router.push(`/${id}`, undefined, { shallow: true });
                    return;
                }

                initNote({
                    id,
                    content: '\n',
                });
            }

            if (!isNew && id !== 'new') {
                await mutateSettings({
                    last_visit: `/${id}`,
                });
            }
        },
        [
            isNew,
            findOrCreateNote,
            settings.daily_root_id,
            genNewId,
            pid,
            fetchNote,
            toast,
            initNote,
            mutateSettings,
        ]
    );

    useEffect(() => {
        abortFindNote();
        loadNoteById(id)
            ?.catch((v) => console.error('Could not load note: %O', v));
    }, [loadNoteById, abortFindNote, id]);

    useEffect(() => {
        updateTitle(note?.title);
    }, [note?.title, updateTitle]);

    // 添加保存按钮的处理函数
    const handleSave = useCallback(() => {
        saveNote();
    }, [saveNote]);

    // 在组件的返回部分，恢复使用 NoteNav 组件
    return (
        <>
            <NoteNav />
            <div>
                {/* 可能的工具栏位置 */}
                <div className="flex items-center justify-between mb-2">
                    {/* 现有UI元素 */}
                    <div className="flex items-center">
                        <SaveButton onSave={handleSave} disabled={!hasUnsavedChanges} />
                    </div>
                </div>
                
                <DeleteAlert />
                <MainEditor />
                {/* 其他UI元素 */}
            </div>
        </>
    );
};
