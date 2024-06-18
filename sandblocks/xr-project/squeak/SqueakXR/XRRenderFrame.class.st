Class {
	#name : #XRRenderFrame,
	#superclass : #Object,
	#instVars : [
		'deltaTime',
		'frame',
		'isNew',
		'world',
		'xrObjects',
		'currentObjectIndex'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #accessing }
XRRenderFrame >> deltaTime [

	^ deltaTime
]

{ #category : #accessing }
XRRenderFrame >> deltaTime: aNumber [

	deltaTime := aNumber
]

{ #category : #accessing }
XRRenderFrame >> fps [

	^ 1000 / self deltaTime
]

{ #category : #accessing }
XRRenderFrame >> frame [

	^ deltaTime
]

{ #category : #accessing }
XRRenderFrame >> frame: aNumber [

	frame := aNumber
]

{ #category : #initialization }
XRRenderFrame >> initialize [

	self isNew: true
]

{ #category : #accessing }
XRRenderFrame >> isNew [

	^ isNew
]

{ #category : #accessing }
XRRenderFrame >> isNew: aBoolean [

	isNew := aBoolean
]

{ #category : #processing }
XRRenderFrame >> process [

	xrObjects ifNil: [xrObjects := self world xrObjects].
	currentObjectIndex
		ifNil: [currentObjectIndex := 1]
		ifNotNil: [
			(xrObjects at: currentObjectIndex) erroredInLastFrame: true.
			currentObjectIndex := currentObjectIndex + 1].
	
	currentObjectIndex to: xrObjects size do: [:index || object |
		currentObjectIndex := index.
		object := xrObjects at: currentObjectIndex.
		object mayStep ifTrue: [object step: self deltaTime]].
	
	self world render
]

{ #category : #accessing }
XRRenderFrame >> world [

	^ world
]

{ #category : #accessing }
XRRenderFrame >> world: anXRWorld [

	world := anXRWorld
]
