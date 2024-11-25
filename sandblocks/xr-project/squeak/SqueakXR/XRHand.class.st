Class {
	#name : #XRHand,
	#superclass : #XRObject,
	#instVars : [
		'index',
		'raycaster',
		'inputSource',
		'triggerPressed',
		'triggerPressedPrev',
		'buttonAPressed',
		'buttonAPressedPrev',
		'errorOccurredDuringRaycastHandling'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #accessing }
XRHand >> buttonAJustPressed [

	^ buttonAPressed and: buttonAPressedPrev not
]

{ #category : #accessing }
XRHand >> buttonAPressed [

	^ buttonAPressed
]

{ #category : #'as yet unclassified' }
XRHand >> castRay [

	| intersection identifier event |
	intersection := self closestIntersectionWithPointableObject
		ifNil: [^ self].
	
	"sphere := Three Mesh
		new: (Three SphereGeometry
			new: 5mm
			widthSegments: 5
			heightSegments: 5)
		material: (Three MeshLambertMaterial
			new: ({#color -> 16rffffff} as: Dictionary)).
	 position copy: intersection point.
	
	self world scene add: sphere."
	
	identifier := intersection object userData at: #xrObjectIdentifier.
	event := XRPointingEvent new
		info: intersection;
		hand: self.
	"TODO: what if identifier is nil"
	(self world xrObjectWithIdentifier: identifier) ifNotNil: [:xrObject |
		[xrObject handleEvent: event]
			on: Error
			do: [:error |
				errorOccurredDuringRaycastHandling := true.
				error signal]].
]

{ #category : #private }
XRHand >> closestIntersectionWithPointableObject [

	| intersections worldDirection worldPosition |
	worldPosition := Three Vector3 new.
	self threeObject getWorldPosition: worldPosition.
	
	worldDirection := Three Vector3 new.
	self threeObject getWorldDirection: worldDirection.
	worldDirection negate.
	
	intersections := self raycaster
		set: worldPosition direction: worldDirection;
		intersectObjects: self world scene children.
	
	"TODO: find a better way to iterate over JS arrays"
	0 to: intersections length - 1 do: [:idx || intersection |
		intersection := intersections at: idx.
		intersection object at: #userData ifPresent: [:userData |
			userData at: #isPointable
				ifPresent: [:isPointable |
					isPointable ifTrue: [^ intersection]]]].
	
	^ nil
]

{ #category : #initializing }
XRHand >> createModel [

	| sphere laser group |
	group := Three Group new.
	
	sphere := Three Mesh
		new: (Three SphereGeometry
			new: 5cm
			widthSegments: 32
			heightSegments: 16)
		material: (Three MeshLambertMaterial
			new: ({#color -> 16rffffff} as: Dictionary)).
	group add: sphere.
	
	laser := Three Mesh
		new: (Three BoxGeometry
			new: 4mm
			height: 4mm
			depth: 100m)
		material: ((Three MeshBasicMaterial
			new: ({#color -> 16rff0000} as: Dictionary))
				transparent: true;
				opacity: 0.5;
				yourself).
	laser position z: -50m.
	group add: laser.
	
	^ group
]

{ #category : #accessing }
XRHand >> gamepad [

	^ inputSource ifNotNil: [inputSource gamepad]
]

{ #category : #accessing }
XRHand >> index [

	^ index
]

{ #category : #accessing }
XRHand >> index: anIndex [

	index := anIndex
]

{ #category : #initializing }
XRHand >> initialize [

	super initialize.
	self raycaster: Three Raycaster new.
	
	errorOccurredDuringRaycastHandling := false.
	
	triggerPressed := false.
	triggerPressedPrev := false.
	
	buttonAPressed := false.
	buttonAPressedPrev := false.
]

{ #category : #initializing }
XRHand >> initializeThreeObject [

	| obj |
	obj := self world renderer xr getController: self index.
	"obj addEventListener: 'select' do: [:event | ToolSet doWithDefaultErrorHandling: [self castRay: 'select']]."
	obj add: self createModel.
	
	obj addEventListener: 'connected' do: [:event |
		inputSource := event data].
	
	obj addEventListener: 'disconnected' do: [:event |
		self assert: inputSource = event data.
		inputSource := nil].
	
	^ obj
]

{ #category : #'as yet unclassified' }
XRHand >> mayStep [

	errorOccurredDuringRaycastHandling
		ifTrue: [
			errorOccurredDuringRaycastHandling := false.
			self erroredInLastFrame: false].
	^ super mayStep
]

{ #category : #accessing }
XRHand >> raycaster [

	^ raycaster
]

{ #category : #accessing }
XRHand >> raycaster: aRaycaster [

	raycaster := aRaycaster
]

{ #category : #'as yet unclassified' }
XRHand >> step: delta [

	self gamepad ifNotNil: [:gamepad |
		triggerPressedPrev := triggerPressed.
		triggerPressed := (gamepad buttons at: 0)
			ifNil: [false]
			ifNotNil: #pressed.
		
		buttonAPressedPrev := buttonAPressed.
		buttonAPressed := (gamepad buttons at: 4)
			ifNil: [false]
			ifNotNil: #pressed.].
	
	"self triggerJustPressed ifTrue: [self castRay]."
	({self triggerJustPressed. self buttonAJustPressed} includes: true) ifTrue: [self castRay]
]

{ #category : #accessing }
XRHand >> triggerJustPressed [

	^ triggerPressed and: triggerPressedPrev not
]

{ #category : #accessing }
XRHand >> triggerPressed [

	^ triggerPressed
]

{ #category : #accessing }
XRHand >> valueOfAxis: anIndex [

	^ self gamepad
		ifNil: [0]
		ifNotNil: [:gp |
			(gp axes at: anIndex) ifNil: [0]]
]

{ #category : #accessing }
XRHand >> xAxis [

	^ self valueOfAxis: 2
]

{ #category : #accessing }
XRHand >> yAxis [

	^ self valueOfAxis: 3
]
