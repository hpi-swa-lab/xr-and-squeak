Class {
	#name : #XRRenderFrame,
	#superclass : #Object,
	#instVars : [
		'deltaTime',
		'frame',
		'isNew',
		'world'
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

	self world xrObjectsDo: [:xrObject | xrObject step: self deltaTime];
		render
]

{ #category : #accessing }
XRRenderFrame >> world [

	^ world
]

{ #category : #accessing }
XRRenderFrame >> world: anXRWorld [

	world := anXRWorld
]
