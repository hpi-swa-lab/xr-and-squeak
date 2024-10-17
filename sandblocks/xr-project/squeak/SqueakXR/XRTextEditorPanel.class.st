Class {
	#name : #XRTextEditorPanel,
	#superclass : #XRObject,
	#instVars : [
		'element',
		'method',
		'codeMirrorView',
		'editedClass',
		'editedSelector'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> codeMirror [

	^ codeMirrorView
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> currentSource [

	^ codeMirrorView state doc toString asString
		copyReplaceAll: '\n' with: String cr;
		copyReplaceAll: '\t' with: String tab
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> editedClass [

	^ editedClass
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> editedClass: aClass selector: aSelector [

	editedClass := aClass.
	editedSelector := aSelector.
	
	codeMirrorView dispatch: ({
		#changes -> ({
			#from -> 0.
			#to -> (codeMirrorView state doc length).
			#insert -> (self originalSource).
			} as: Dictionary)
		} as: Dictionary)
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> editedSelector [

	^ editedSelector
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> handlePointing: anEvent [

	"JS console log: pointingInformation."
	anEvent hand triggerJustPressed ifTrue: [
		self codeMirror focus].
	
	anEvent hand buttonAJustPressed ifTrue: [
		self save]
	
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> initialize [

	super initialize.

	element := JS window document createElement: 'div'.
	element style
		width: 800px;
		height: 400px;
		background: '#fff';
		at: #'font-family' put: 'Arial';
		at: #'font-size' put: 12px.
	self addChild: (XRHtmlPanel new element: element).

	codeMirrorView := (JS CodeMirror at: #EditorView) new: ({
		#doc -> 'test'.
		#parent -> element.
			} as: Dictionary).
	
	codeMirrorView dom parentElement parentElement style visibility: #visible.
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> originalSource [

	^ self editedClass ultimateSourceCodeAt: self editedSelector ifAbsent: ['Failed to retrieve source']
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> save [

	Transcript
		showln: 'saving ', self editedClass asString, '>>', self editedSelector;
		showln: self currentSource.
	[editedClass compile: self currentSource]
		"Just for now, currently handling exceptions too eagerly"
		on: CurrentEnvironment do: [:signal | signal resume]
		on: Error do: [:e | Transcript showln: e class asString, e description]
]
