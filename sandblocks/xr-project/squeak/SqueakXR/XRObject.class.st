Class {
	#name : #XRObject,
	#superclass : #Object,
	#instVars : [
		'world',
		'threeObject',
		'children',
		'erroredInLastFrame',
		'parent'
	],
	#classVars : [
		'Up'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #'as yet unclassified' }
XRObject class >> up [

	^ Up ifNil: [Up := Three Vector3 new: 0 y: 1 z: 0]
]

{ #category : #'add/remove' }
XRObject >> addChild: anXRObject [

	self children add: anXRObject.
	self threeObject add: anXRObject threeObject.
	anXRObject world: self world.
	anXRObject parent: self.
]

{ #category : #accessing }
XRObject >> children [

	^ children
]

{ #category : #accessing }
XRObject >> erroredInLastFrame [

	^ erroredInLastFrame
]

{ #category : #accessing }
XRObject >> erroredInLastFrame: aBoolean [

	erroredInLastFrame := aBoolean
]

{ #category : #accessing }
XRObject >> handleEvent: anEvent [

	anEvent isPointing ifTrue: [self handlePointing: anEvent].
	
	(anEvent shouldContinuePropagating and: [self hasParent]) ifTrue: [
		self parent handleEvent: anEvent]
]

{ #category : #'as yet unclassified' }
XRObject >> handlePointing: pointingInformation [
]

{ #category : #'as yet unclassified' }
XRObject >> hasParent [

	^ self parent notNil
]

{ #category : #accessing }
XRObject >> identifier [

	^ self identityHash
]

{ #category : #initializing }
XRObject >> initialize [

	children := OrderedCollection new.
	self erroredInLastFrame: false.
]

{ #category : #initializing }
XRObject >> initializeThreeObject [

	^ Three Object3D new
]

{ #category : #'as yet unclassified' }
XRObject >> matchesIdentifier: aHash [

	^ self identityHash = aHash
]

{ #category : #stepping }
XRObject >> mayStep [

	^ self erroredInLastFrame not
]

{ #category : #accessing }
XRObject >> parent [

	^ parent
]

{ #category : #accessing }
XRObject >> parent: anXRObject [

	parent := anXRObject
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

	self assert: (self children includes: anXRObject).
	
	self children remove: anXRObject.
	self threeObject remove: anXRObject threeObject.
	anXRObject world: nil.
	anXRObject parent: nil.
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

	world := aWorld.
	self children do: [:child | child world: aWorld]
]

{ #category : #accessing }
XRObject >> worldTransform [

	^ self threeObject matrixWorld
]

{ #category : #'as yet unclassified' }
XRObject >> xrObjectWithIdentifier: anIdentifier [

	(self matchesIdentifier: anIdentifier) ifTrue: [^ self].
	self children do: [:child | (child xrObjectWithIdentifier: anIdentifier) ifNotNil: [:object | ^ object]].
	^ nil
]
