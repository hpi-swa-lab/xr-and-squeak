Class {
	#name : #XRAvatar,
	#superclass : #XRObject,
	#instVars : [
		'camera',
		'hands'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #accessing }
XRAvatar >> camera [

	^ camera ifNil: [
		camera := Three PerspectiveCamera
			new: 50
			aspect: XRWorld aspect
			near: 0.1
			far: 100.
		camera position set: 0m y: 1.6m z: 3m.
		^ camera]
]

{ #category : #'as yet unclassified' }
XRAvatar >> createControllerHands [

	^ hands ifNil: [
		hands := {
			XRHand new
				world: self world;
				index: 0;
				yourself.
			XRHand new
				world: self world;
				index: 1;
				yourself.
		} do: [:hand | self addChild: hand]]
	
]

{ #category : #initializing }
XRAvatar >> initializeThreeObject [

	| group |
	group := Three Group new
		add: self camera;
		yourself.
	
	^ group
]
