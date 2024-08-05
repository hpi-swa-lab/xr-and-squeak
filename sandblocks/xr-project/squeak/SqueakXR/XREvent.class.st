Class {
	#name : #XREvent,
	#superclass : #Object,
	#instVars : [
		'propagating',
		'info'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #'as yet unclassified' }
XREvent >> info [

	^ info
]

{ #category : #'as yet unclassified' }
XREvent >> info: eventInfo [

	info := eventInfo
]

{ #category : #'as yet unclassified' }
XREvent >> initialize [

	propagating := true
]

{ #category : #'as yet unclassified' }
XREvent >> shouldContinuePropagating [

	^ propagating
]

{ #category : #'as yet unclassified' }
XREvent >> stopPropagating [

	propagating := false
]
