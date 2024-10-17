Class {
	#name : #XREvent,
	#superclass : #Object,
	#instVars : [
		'propagating',
		'info',
		'hand'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #'as yet unclassified' }
XREvent >> hand [

	^ hand
]

{ #category : #'as yet unclassified' }
XREvent >> hand: aHand [

	hand := aHand
]

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
XREvent >> isPointing [

	^ false
]

{ #category : #'as yet unclassified' }
XREvent >> shouldContinuePropagating [

	^ propagating
]

{ #category : #'as yet unclassified' }
XREvent >> stopPropagating [

	propagating := false
]
