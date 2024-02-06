Class {
	#name : #XRObject,
	#superclass : #Object,
	#instVars : [
		'world',
		'threeObject'
	],
	#category : #SqueakXR
}

{ #category : #'as yet unclassified' }
XRObject >> handlePointing: pointingInformation [
]

{ #category : #accessing }
XRObject >> identifier [

	^ self identityHash
]

{ #category : #initializing }
XRObject >> initializeThreeObject [

	self subclassResponsibility
]

{ #category : #accessing }
XRObject >> matchesIdentifier: aHash [

	^ self identityHash = aHash
]

{ #category : #accessing }
XRObject >> threeObject [

	^ threeObject ifNil: [
		threeObject := self initializeThreeObject.
		threeObject userData at: #xrObjectIdentifier put: self identityHash.
		threeObject]
]

{ #category : #accessing }
XRObject >> world [

	^ world
]

{ #category : #accessing }
XRObject >> world: aWorld [

	world := aWorld
]
