TranscriptStream redirectToStdOut.
Transcript showln: 'Deleting projects...'.
JSObjectProxy initialize.

Project allProjects copy do: [:p |
	ProjectHistory forget: p.
	Project deletingProject: p].
Project clearCurrent.

priorBits := Display bits.
(Display setExtent: 1 @ 1 depth: 32) beDisplay.
"FIXME: seems hacky but saves a lot of space"
Display bits unpin.
priorBits := nil.
Display := nil.

ActiveHand := nil.
ActiveWorld := nil.
ActiveEvent := nil.
World := nil.
ScriptingSystem := nil.
Sensor := nil.
CustomEventsRegistry := nil.
TextConstants removeAll.
(Url classPool at: #SchemeRegistry) removeKey: 'git' ifAbsent: [].
(FileServices classPool at: #FileReaderRegistry) removeAll.

ChangeSet removeChangeSetsNamedSuchThat: [:cs | true].
Smalltalk at: #OCompletionTable ifPresent: [:c | c reset].

Smalltalk garbageCollect.

Smalltalk imageName: (FileDirectory default fullNameFor: 'full-image-no-ui.image') asSqueakPathName.
Smalltalk snapshotPrimitive.

ClassDescription logCompiledSources: false.
JS at: #sqEval put: [:e | Compiler evaluate: e].
