Class {
	#name : #XRAvatar,
	#superclass : #XRObject,
	#instVars : [
		'camera',
		'hands',
		'lastRotationTime'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #'as yet unclassified' }
XRAvatar >> applyRotation [

	| axis now |
	now := DateAndTime now.
	axis := self rightHand xAxis.
	((now - lastRotationTime) asMilliSeconds > 200 and: [axis abs > 0.5]) ifTrue: [
		lastRotationTime := now.
		self threeObject rotateOnAxis: XRObject up angle: 45 degreesToRadians * axis sign negated]
]

{ #category : #'as yet unclassified' }
XRAvatar >> applyTranslation: delta [

	| offset speed rotation |
	speed := 0.01.
	offset := Three Vector3
		new: self leftHand xAxis
		y: 0
		z: self leftHand yAxis.
	offset length < 0.1 ifTrue: [^ self].
	
	rotation := Three Quaternion new.
	self leftHand threeObject getWorldQuaternion: rotation.
	
	offset
		applyQuaternion: rotation;
		y: 0;
		normalize;
		multiplyScalar: speed * delta.
	self position add: offset.
]

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

{ #category : #accessing }
XRAvatar >> hands [

	^ hands
]

{ #category : #initializing }
XRAvatar >> initialize [

	super initialize.
	lastRotationTime := DateAndTime epoch.
]

{ #category : #initializing }
XRAvatar >> initializeThreeObject [

	| group |
	group := Three Group new
		add: self camera;
		yourself.
	
	^ group
]

{ #category : #accessing }
XRAvatar >> leftHand [

	^ self hands first
]

{ #category : #accessing }
XRAvatar >> rightHand [

	^ self hands second
]

{ #category : #'as yet unclassified' }
XRAvatar >> step: delta [

	self applyTranslation: delta.
	self applyRotation.
]
