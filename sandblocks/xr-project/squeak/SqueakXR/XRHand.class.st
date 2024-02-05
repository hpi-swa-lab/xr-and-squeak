Class {
	#name : #XRHand,
	#superclass : #Object,
	#instVars : [
		'index',
		'threeObject',
		'world',
		'raycaster'
	],
	#category : #SqueakXR
}

{ #category : #'as yet unclassified' }
XRHand >> castRay [

	JS console log: self closestPointableObject
]

{ #category : #private }
XRHand >> closestPointableObject [

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
	0 to: intersections length - 1 do: [:idx || object |
		intersections at: idx.
		object := intersections object.
		object userData at: 'isPointable' ifPresent: [:value |
			value ifTrue: [^ object]]].
	
	^ nil
]

{ #category : #'as yet unclassified' }
XRHand >> createModel [

	| sphere laser |
	sphere := Three Mesh
		new: (Three SphereGeometry
			new: 5cm
			widthSegments: 32
			heightSegments: 16)
		material: (Three MeshLambertMaterial
			new: ({#color -> 16rffffff} as: Dictionary)).
	
	self threeObject add: sphere.
	
	laser := Three Mesh
		new: (Three CylinderGeometry
			new: 1cm
			radiusBottom: 1cm
			height: 100m)
		material: ((Three MeshLambertMaterial
			new: ({#color -> 16rff0000} as: Dictionary))
				transparent: true;
				opacity: 0.5;
				yourself).
	laser position z: -50m.
	laser rotation x: 90 degreesToRadians.
	self threeObject add: laser.
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

	self raycaster: Three Raycaster new.
]

{ #category : #accessing }
XRHand >> raycaster [

	^ raycaster
]

{ #category : #accessing }
XRHand >> raycaster: aRaycaster [

	raycaster := aRaycaster
]

{ #category : #accessing }
XRHand >> threeObject [
	
	^ threeObject ifNil: [
		threeObject := self world renderer xr getController: self index.
		threeObject addEventListener: 'select' do: [:event | self castRay].
		
		self createModel.
		
		threeObject]
]

{ #category : #accessing }
XRHand >> world [

	^ world
]

{ #category : #accessing }
XRHand >> world: aWorld [

	world := aWorld
]
