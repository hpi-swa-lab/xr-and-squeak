Class {
	#name : #XRObjectMock,
	#superclass : #XRObject,
	#instVars : [
		'eventReceivedCount',
		'stopEventPropagation'
	],
	#category : #'SqueakXR-Core-Tests'
}

{ #category : #configuration }
XRObjectMock >> allowEventPropagation [

	stopEventPropagation := false
]

{ #category : #configuration }
XRObjectMock >> forbidEventPropagation [

	stopEventPropagation := true
]

{ #category : #'as yet unclassified' }
XRObjectMock >> handlePointing: anEvent [

	eventReceivedCount := eventReceivedCount + 1.
	
	stopEventPropagation ifTrue: [anEvent stopPropagating]
]

{ #category : #'as yet unclassified' }
XRObjectMock >> initialize [

	super initialize.
	eventReceivedCount := 0.
	stopEventPropagation := false.
]

{ #category : #configuration }
XRObjectMock >> receivedEvent [

	^ eventReceivedCount > 0
]
