Class {
	#name : #XRObject,
	#superclass : #Object,
	#instVars : [
		'world',
		'threeObject',
		'children'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #'add/remove' }
XRObject >> addChild: anXRObject [

	self children add: anXRObject.
	self threeObject add: anXRObject threeObject.
]

{ #category : #accessing }
XRObject >> children [

	^ children
]

{ #category : #'as yet unclassified' }
XRObject >> handlePointing: pointingInformation [
]

{ #category : #accessing }
XRObject >> identifier [

	^ self identityHash
]

{ #category : #initializing }
XRObject >> initialize [

	children := OrderedCollection new.
]

{ #category : #initializing }
XRObject >> initializeThreeObject [

	^ Three Object3D new
]

{ #category : #'as yet unclassified' }
XRObject >> matchesIdentifier: aHash [

	^ self identityHash = aHash
]

{ #category : #accessing }
XRObject >> position [

	^ self threeObject position
]

{ #category : #accessing }
XRObject >> position: aVector3 [

	self threeObject position copy: aVector3
]

{ #category : #'add/remove' }
XRObject >> removeChild: anXRObject [

	self children remove: anXRObject.
	self threeObject remove: anXRObject threeObject.
]

{ #category : #stepping }
XRObject >> step: deltaTimeInMs [
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
