Class {
	#name : #XRObject,
	#superclass : #Object,
	#instVars : [
		'world',
		'threeObject'
	],
	#category : #SqueakXR
}

{ #category : #initializing }
XRObject >> initializeThreeObject [

	self subclassResponsibility
]

{ #category : #accessing }
XRObject >> threeObject [

	^ threeObject ifNil: [threeObject := self initializeThreeObject]
]

{ #category : #accessing }
XRObject >> world [

	^ world
]

{ #category : #accessing }
XRObject >> world: aWorld [

	world := aWorld
]
