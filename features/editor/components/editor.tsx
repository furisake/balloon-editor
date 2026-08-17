'use client'

import {
  type CSSProperties,
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Editor as TipTapEditor, EditorContent, useEditor } from '@tiptap/react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiCheckLine,
  RiEditLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiFileDownloadLine,
  RiRestartLine,
  RiSave3Line,
  RiWrenchLine,
} from '@remixicon/react'
import {
  initialContent,
  initialDocumentTitle,
  plugins,
} from '@/features/editor/config'
import { cn } from '@/lib/utils'

import {
  BrowserFileHandle,
  DocumentStatistics,
  EditorDocument,
  EditorSettings,
  FilePickerWindow,
} from '../type'
import {
  docToText,
  textToDocument,
  buildFileName,
  encodeShiftJis,
  buildStatistics,
  buildLocalSaveData,
  readFile,
} from '../helper'
import StarterKit from '@tiptap/starter-kit'
import { Menu } from '@base-ui/react'
import { Viewer } from '../../../components/viewer/viewer'
import Link from 'next/link'

const editorOptsBase = {
  extensions: [
    StarterKit.configure({
      blockquote: false,
      bold: false,
      bulletList: false,
      code: false,
      codeBlock: false,
      dropcursor: false,
      gapcursor: false,
      heading: false,
      horizontalRule: false,
      italic: false,
      link: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      strike: false,
      trailingNode: false,
      underline: false,
    }),
    ...plugins.values().map((p) => p.extention),
  ],
  immediatelyRender: false,
  enableInputRules: false,
  enablePasteRules: false,
  editorProps: {
    attributes: {
      class:
        'min-h-[calc(100dvh-15rem)] whitespace-pre-wrap px-7 py-10 font-serif text-[0.9375rem] leading-[1.9] tracking-[0.035em] caret-primary outline-none sm:px-[clamp(2rem,8vw,5rem)] sm:py-16 sm:text-base [&_p]:m-0 [&_p]:min-h-[1.9em]',
      'data-tiptap-editor': '',
      lang: 'ja',
      spellcheck: 'false',
      'aria-label': '青空文庫テキスト原文',
    },
  },
}

const autoSaveDelayMilliSecond = 1000

function parseLocalSaveData(value: unknown) {
  if (typeof value !== 'object' || value === null) return null

  const data = value as Record<string, unknown>
  const title = data.title ?? data.name
  const text = data.text ?? data.content

  if (typeof title !== 'string' || typeof text !== 'string') return null
  return { title, text }
}

export function Editor() {
  // consts
  const [initialDoc] = useState<EditorDocument>(() => {
    const initialDoc = textToDocument({
      title: initialDocumentTitle,
      text: initialContent,
    })
    if (typeof window === 'undefined') return initialDoc

    try {
      const localSaveDataStr = localStorage.getItem('balloon-editor-autosave')
      if (localSaveDataStr) {
        const localSaveData = parseLocalSaveData(JSON.parse(localSaveDataStr))
        if (localSaveData) return textToDocument(localSaveData)
      }
    } catch (_e) {
      return initialDoc
    }
    return initialDoc
  })

  // 入力系
  const [docTitle, setDocTitle] = useState(initialDoc.title)
  const [setting, setSetting] = useState<EditorSettings>({
    isVertical: false,
    charactersPerLine: null,
    pluginEnabled: new Map(plugins.keys().map((name) => [name, true])),
  })
  const [isEditing, setIsEditing] = useState(true)

  // エディタの状態
  const [isSaved, setIsSaved] = useState(true)
  const [notice, setNotice] = useState('準備ができました')
  const [previewDoc, setPreviewDoc] = useState<EditorDocument>(initialDoc)
  const [docStats, setDocStats] = useState<DocumentStatistics>(
    buildStatistics({ document: initialDoc }),
  )

  // ファイル操作
  const [fileHandle, setFileHandle] = useState<BrowserFileHandle | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [])

  // エディタの初期化
  const editor: TipTapEditor | null = useEditor({
    ...editorOptsBase,
    content: initialDoc,
    onCreate: ({ editor: currentEditor }) => {
      const content = currentEditor.getJSON()
      const document: EditorDocument = {
        title: docTitle,
        ...content,
      }
      setPreviewDoc(document)
      setDocStats(buildStatistics({ document }))
    },
    onUpdate: ({ editor: currentEditor }) => {
      const content = currentEditor.getJSON()
      const document: EditorDocument = {
        title: docTitle,
        ...content,
      }
      setPreviewDoc(document)
      setDocStats(buildStatistics({ document }))

      setIsSaved(false)
      setNotice('編集中…')

      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(() => {
        const localSaveData = buildLocalSaveData({
          document,
        })
        try {
          localStorage.setItem(
            'balloon-editor-autosave',
            JSON.stringify(localSaveData),
          )
          setNotice('下書きを自動保存しました')
        } catch {
          setNotice('下書きの保存に失敗しました')
        }
      }, autoSaveDelayMilliSecond)
    },
  })
  useEffect(() => {
    if (!editor) return

    plugins.forEach((plugin, name) => {
      editor.view.dispatch(
        editor.state.tr.setMeta(
          plugin.key,
          setting.pluginEnabled.get(name) ?? true,
        ),
      )
    })
  }, [editor, setting])

  // ハンドラ
  const loadFile = async (
    file: File,
    handle: BrowserFileHandle | null = null,
  ) => {
    const document = await readFile(file)
    editor.commands.setContent({ ...document }, { emitUpdate: false })

    setDocTitle(document.title)
    setPreviewDoc(document)
    setDocStats(buildStatistics({ document }))
    setIsEditing(true)
    setIsSaved(true)
    setFileHandle(handle)

    editor.commands.focus('start')
  }

  const handleReset = () => {
    const confirmed = window.confirm(
      '現在の文書と自動保存された下書きを消して、初期状態に戻してもよろしいですか？',
    )
    if (!confirmed) return

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = null
    }

    const document = textToDocument({
      title: initialDocumentTitle,
      text: initialContent,
    })
    editor.commands.setContent({ ...document }, { emitUpdate: false })

    try {
      localStorage.removeItem('balloon-editor-autosave')
    } catch {
      // ブラウザの保存領域が利用できなくても、画面上のリセットは続行する。
    }

    setDocTitle(initialDocumentTitle)
    setPreviewDoc(document)
    setDocStats(buildStatistics({ document }))
    setSetting({
      isVertical: false,
      charactersPerLine: null,
      pluginEnabled: new Map(plugins.keys().map((name) => [name, true])),
    })
    setIsEditing(true)
    setIsSaved(true)
    setFileHandle(null)
    setNotice('初期状態に戻しました')
    editor.commands.focus('start')
  }

  const handleOpen = async () => {
    const pickerWindow = window as FilePickerWindow

    if (pickerWindow.showOpenFilePicker) {
      try {
        const [handle] = await pickerWindow.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: '青空文庫テキスト',
              accept: { 'text/plain': ['.txt'] },
            },
          ],
        })
        const file = await handle.getFile()
        await loadFile(file, handle)

        setNotice(`ファイルを開きました`)
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          setNotice('ファイルの選択をキャンセルしました')
          return
        }
      }
    }

    fileInputRef.current?.click()
  }

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]

    try {
      if (!file) return
      await loadFile(file)
      setNotice(`ファイルを開きました`)
    } catch {
      setNotice('ファイルを読み込めませんでした')
    } finally {
      input.value = ''
    }
  }

  const handleSave = useCallback(async () => {
    // 文書の内容を取得
    let editorDocument: EditorDocument
    try {
      const content = editor.getJSON()
      editorDocument = {
        title: docTitle,
        ...content,
      }
    } catch {
      setNotice('文書の内容を取得できません')
      return
    }

    // Shift_JISに変換
    let encodedData: Uint8Array<ArrayBuffer>
    try {
      const data = docToText(editorDocument, '\r\n')
      encodedData = encodeShiftJis(data)
    } catch {
      setNotice('Shift_JISで表現できない文字があるため、保存を中止しました')
      return
    }

    // ファイル名を生成
    let handle = fileHandle
    const fileName = buildFileName({ document: editorDocument })
    try {
      const pickerWindow = window as FilePickerWindow
      if (!handle && pickerWindow.showSaveFilePicker) {
        handle = await pickerWindow.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: '青空文庫テキスト',
              accept: { 'text/plain': ['.txt'] },
            },
          ],
        })
        setFileHandle(handle)
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setNotice('ファイルの保存をキャンセルしました')
      } else {
        setNotice('ファイルを保存できませんでした')
      }
      return
    }

    // ファイルに書き込み
    try {
      if (handle) {
        const writable = await handle.createWritable()
        await writable.write(encodedData)
        await writable.close()
      } else {
        const blob = new Blob([encodedData], {
          type: 'text/plain;charset=shift_jis',
        })
        const url = URL.createObjectURL(blob)
        const link = window.document.createElement('a')
        link.href = url
        link.download = fileName
        link.click()
        URL.revokeObjectURL(url)
      }

      setIsSaved(true)
      setNotice('ファイルに保存しました')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setNotice('ファイルの保存をキャンセルしました')
      } else {
        setNotice('ファイルを保存できませんでした')
      }
    }
  }, [docTitle, editor, fileHandle])

  // キーボードショートカットの登録
  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (!event.repeat) void handleSave()
      }
    }

    window.addEventListener('keydown', handleSaveShortcut)
    return () => window.removeEventListener('keydown', handleSaveShortcut)
  }, [handleSave])

  if (!editor) {
    return (
      <main className="text-muted-foreground grid h-dvh place-items-center font-sans text-sm">
        エディタを準備しています…
      </main>
    )
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden font-sans">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-3">
          <Menu.Root>
            <Menu.Trigger
              render={<Button type="button" variant="ghost" size="icon-sm" />}
              aria-label="設定メニューを開く"
              title="設定"
            >
              <RiWrenchLine aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner
                className="z-50 outline-hidden"
                sideOffset={8}
                align="start"
              >
                <Menu.Popup className="bg-popover text-popover-foreground w-72 origin-(--transform-origin) border p-1 shadow-lg outline-hidden transition-[scale,opacity] duration-100 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
                  <Menu.Group>
                    <Menu.GroupLabel className="text-muted-foreground px-2 py-1.5 text-[10px] font-medium tracking-wider uppercase">
                      書字方向
                    </Menu.GroupLabel>
                    <Menu.RadioGroup
                      value={setting.isVertical}
                      onValueChange={(vertical: boolean) =>
                        setSetting({
                          ...setting,
                          isVertical: vertical,
                        })
                      }
                    >
                      <Menu.RadioItem
                        value={false}
                        className="data-highlighted:bg-accent data-highlighted:text-accent-foreground grid cursor-default grid-cols-[1.25rem_1.5rem_1fr] items-center gap-2 px-2 py-2 text-xs outline-hidden select-none"
                      >
                        <Menu.RadioItemIndicator
                          keepMounted
                          className="text-primary grid size-5 place-items-center data-unchecked:text-transparent"
                        >
                          <RiCheckLine
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        </Menu.RadioItemIndicator>
                        <span
                          className="border-b border-current font-serif leading-none"
                          aria-hidden="true"
                        >
                          あ
                        </span>
                        横書き
                      </Menu.RadioItem>
                      <Menu.RadioItem
                        value={true}
                        className="data-highlighted:bg-accent data-highlighted:text-accent-foreground grid cursor-default grid-cols-[1.25rem_1.5rem_1fr] items-center gap-2 px-2 py-2 text-xs outline-hidden select-none"
                      >
                        <Menu.RadioItemIndicator
                          keepMounted
                          className="text-primary grid size-5 place-items-center data-unchecked:text-transparent"
                        >
                          <RiCheckLine
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        </Menu.RadioItemIndicator>
                        <span
                          className="border-r border-current font-serif leading-none [writing-mode:vertical-rl]"
                          aria-hidden="true"
                        >
                          あ
                        </span>
                        縦書き
                      </Menu.RadioItem>
                    </Menu.RadioGroup>
                  </Menu.Group>
                  <Menu.Separator className="bg-border mx-2 my-1 h-px" />
                  <Menu.Group>
                    <Menu.GroupLabel className="text-muted-foreground px-2 py-1.5 text-[10px] font-medium tracking-wider uppercase">
                      1列の文字数
                    </Menu.GroupLabel>
                    <div className="flex items-center gap-2 px-2 pb-2">
                      <input
                        type="number"
                        min={1}
                        max={200}
                        inputMode="numeric"
                        value={setting.charactersPerLine ?? ''}
                        placeholder="自動"
                        aria-label="1列あたりの文字数"
                        onChange={(event) => {
                          const value = event.currentTarget.value
                          setSetting((currentSetting) => ({
                            ...currentSetting,
                            charactersPerLine:
                              value === ''
                                ? null
                                : Math.min(
                                    200,
                                    Math.max(1, Number.parseInt(value, 10)),
                                  ),
                          }))
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 h-8 min-w-0 flex-1 border px-2 text-xs outline-none focus:ring-2"
                      />
                      <span className="text-muted-foreground text-xs">字</span>
                    </div>
                  </Menu.Group>
                  <Menu.Separator className="bg-border mx-2 my-1 h-px" />
                  <Menu.Group>
                    <Menu.GroupLabel className="text-muted-foreground flex items-center justify-between px-2 py-1.5 text-[10px] font-medium tracking-wider uppercase">
                      <span>プラグイン</span>
                    </Menu.GroupLabel>
                    {[...plugins.entries()].map(([name, plugin]) => (
                      <Menu.CheckboxItem
                        key={name}
                        checked={setting.pluginEnabled.get(name) ?? true}
                        onCheckedChange={(enabled) => {
                          setSetting((currentSetting) => ({
                            ...currentSetting,
                            pluginEnabled: new Map(
                              currentSetting.pluginEnabled,
                            ).set(name, enabled),
                          }))
                        }}
                        className="data-highlighted:bg-accent data-highlighted:text-accent-foreground grid cursor-default grid-cols-[2rem_1fr_1.25rem] items-center gap-2 px-2 py-2 outline-hidden select-none"
                      >
                        <span className="grid size-8 place-items-center bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          <RiErrorWarningLine aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-medium">
                            {plugin.name}
                          </span>
                          <span className="text-muted-foreground block text-[10px] leading-relaxed">
                            {plugin.description}
                          </span>
                        </span>
                        <Menu.CheckboxItemIndicator
                          keepMounted
                          className="bg-primary text-primary-foreground data-unchecked:bg-muted grid size-5 place-items-center data-unchecked:text-transparent"
                        >
                          <RiCheckLine
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        </Menu.CheckboxItemIndicator>
                      </Menu.CheckboxItem>
                    ))}
                  </Menu.Group>
                  <Menu.Separator className="bg-border mx-2 my-1 h-px" />
                  <Menu.Item
                    onClick={handleReset}
                    className="text-destructive data-highlighted:bg-destructive/10 flex cursor-default items-center gap-2 px-2 py-2 text-xs outline-hidden select-none"
                  >
                    <span className="bg-destructive/10 text-destructive grid size-8 place-items-center">
                      <RiRestartLine aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-medium">初期状態に戻す</span>
                      <span className="text-muted-foreground block text-[10px]">
                        現在の文書と下書きを消去
                      </span>
                    </span>
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <Link
            aria-label="ホームに戻る"
            className="text-foreground flex shrink-0 items-center gap-3 no-underline"
            href="/"
          >
            <span className="grid size-8 place-items-center overflow-hidden rounded-md">
              <Image
                alt=""
                aria-hidden="true"
                className="size-8 object-cover"
                height={32}
                src="/balloon-icon.png"
                width={32}
              />
            </span>
            <div className="hidden lg:block">
              <h1 className="font-heading text-sm font-semibold tracking-tight">
                Balloon Editor
              </h1>
              <p className="text-muted-foreground hidden text-[10px] sm:block">
                青空文庫 校正エディタ
              </p>
            </div>
          </Link>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2 sm:px-4">
          <input
            value={docTitle}
            aria-label="文書名"
            className="hover:border-border focus:border-primary max-w-52 min-w-0 flex-1 border-b border-transparent bg-transparent px-2 py-1 text-center text-sm font-medium transition-colors outline-none"
            onChange={(event) => {
              setDocTitle(event.target.value)
              setFileHandle(null)
              setIsSaved(false)
            }}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileInput}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpen}
          >
            <RiFileDownloadLine aria-hidden="true" />
            <span className="hidden sm:inline">ファイルを開く</span>
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            <RiSave3Line aria-hidden="true" />
            <span>保存（Ctrl S）</span>
          </Button>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col" aria-label="文書編集">
        <div
          className="flex min-h-11 shrink-0 items-center gap-1 overflow-x-auto border-b px-3 py-1.5 sm:px-5"
          aria-label="編集ツールバー"
        >
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="元に戻す"
              title="元に戻す"
              disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <RiArrowGoBackLine aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="やり直す"
              title="やり直す"
              disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <RiArrowGoForwardLine aria-hidden="true" />
            </Button>
          </div>
          <span className="bg-border mx-1 h-5 w-px shrink-0" />
          <div
            className="bg-background flex items-center border p-0.5"
            aria-label="表示"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(isEditing && 'bg-accent text-accent-foreground')}
              aria-pressed={isEditing}
              onClick={() => setIsEditing(true)}
            >
              <RiEditLine aria-hidden="true" />
              編集
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(!isEditing && 'bg-accent text-accent-foreground')}
              aria-pressed={!isEditing}
              onClick={() => setIsEditing(false)}
            >
              <RiEyeLine aria-hidden="true" />
              プレビュー
            </Button>
          </div>
        </div>

        <div className="bg-muted/40 min-h-0 flex-1 overflow-auto p-3 sm:p-6 lg:p-8">
          {isEditing ? (
            <article
              className={cn(
                'bg-background mx-auto border shadow-sm',
                setting.isVertical
                  ? 'h-[calc(100dvh-15rem)] min-h-128 w-full overflow-x-auto overflow-y-hidden [&_[data-tiptap-editor]]:h-full [&_[data-tiptap-editor]]:min-h-0 [&_[data-tiptap-editor]]:w-max [&_[data-tiptap-editor]]:min-w-full [&_[data-tiptap-editor]]:p-8 [&_[data-tiptap-editor]]:[overflow-wrap:normal] [&_[data-tiptap-editor]]:[text-orientation:upright] [&_[data-tiptap-editor]]:[writing-mode:vertical-rl] sm:[&_[data-tiptap-editor]]:p-14 [&_[data-tiptap-editor]_p]:min-h-0 [&_[data-tiptap-editor]_p]:min-w-[1.9em]'
                  : 'min-h-[calc(100dvh-15rem)] w-[min(48rem,100%)]',
                setting.charactersPerLine !== null &&
                  (setting.isVertical
                    ? 'h-fit min-h-0 [&_[data-tiptap-editor]]:box-content [&_[data-tiptap-editor]]:h-[calc(var(--characters-per-line)*1.035em)] [&_[data-tiptap-editor]]:min-h-0'
                    : 'w-fit max-w-none [&_[data-tiptap-editor]]:box-content [&_[data-tiptap-editor]]:w-[calc(var(--characters-per-line)*1.035em)]'),
              )}
              style={
                setting.charactersPerLine === null
                  ? undefined
                  : ({
                      '--characters-per-line': setting.charactersPerLine,
                    } as CSSProperties)
              }
            >
              <EditorContent editor={editor} />
            </article>
          ) : (
            <Viewer
              text={docToText(previewDoc, '\n')}
              vertical={setting.isVertical}
              charactersPerLine={setting.charactersPerLine}
            />
          )}
        </div>

        <footer className="bg-background text-muted-foreground flex h-8 shrink-0 items-center gap-4 border-t px-4 text-[10px] sm:px-6">
          <span className="mr-auto flex items-center gap-2">
            <span
              className="size-1.5 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            {notice}
          </span>
          <span className="text-muted-foreground hidden shrink-0 items-center gap-1.5 border-l pl-3 text-[10px] lg:flex">
            <span
              className={`size-1.5 rounded-full ${isSaved ? 'bg-emerald-500' : 'bg-amber-500'}`}
              aria-hidden="true"
            />
            {isSaved ? '保存済み' : '未保存'}
          </span>
          <span className="border-r pr-4">
            {docStats.lineCount.toLocaleString('ja-JP')} 行
          </span>
          <span className="border-r pr-4">
            1列 {setting.charactersPerLine ?? '自動'}
            {setting.charactersPerLine === null ? '' : '字'}
          </span>
          <span>{docStats.characterCount.toLocaleString('ja-JP')} 文字</span>
        </footer>
      </section>
    </main>
  )
}
