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
			#insert -> (self source).
			} as: Dictionary)
		} as: Dictionary)
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> editedSelector [

	^ editedSelector
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> handlePointing: pointingInformation [

	Transcript showln: 'pointingInformation'.
	"JS console log: pointingInformation."
	self codeMirror focus
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> initialize [

	super initialize.

	element := JS window document createElement: 'div'.
	element style
		width: 400px;
		height: 400px.
	self addChild: (XRHtmlPanel new element: element).
	
	Transcript showln: (JS String toString: (JS CodeMirror at: #EditorView)).
	"JS CodeMirror EditorView new: ({
		#doc -> 'test'.
		#parent -> element.
			} as: Dictionary)"
]

{ #category : #'as yet unclassified' }
XRTextEditorPanel >> source [

	^ self editedClass ultimateSourceCodeAt: self editedSelector ifAbsent: ['Failed to retrieve source']
]
