Class {
	#name : #XRHand,
	#superclass : #XRObject,
	#instVars : [
		'index',
		'raycaster'
	],
	#category : #SqueakXR
}

{ #category : #'as yet unclassified' }
XRHand >> castRay [

	| intersection sphere planePosition |
	intersection := self closestIntersectionWithPointableObject.
	
	sphere := Three Mesh
		new: (Three SphereGeometry
			new: 5mm
			widthSegments: 5
			heightSegments: 5)
		material: (Three MeshLambertMaterial
			new: ({#color -> 16rffffff} as: Dictionary)).
	sphere position copy: intersection point.
	
	self world scene add: sphere.
	
	planePosition := intersection object worldToLocal: intersection point.
	
	JS console log: planePosition and: intersection.
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
	0 to: intersections length - 1 do: [:idx || intersection isPointable |
		intersection := intersections at: idx.
		"TODO: JSObjectProxy does not yet support things like at:ifPresent:"
		isPointable := (intersection object userData at: 'isPointable')
			ifNil: false
			ifNotNil: #value.
		
		isPointable ifTrue: [^ intersection]].
	
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
		new: (Three CylinderGeometry
			new: 5mm
			radiusBottom: 5mm
			height: 100m
			radialSegments: 10)
		material: ((Three MeshLambertMaterial
			new: ({#color -> 16rff0000} as: Dictionary))
				transparent: true;
				opacity: 0.5;
				yourself).
	laser position z: -50m.
	laser rotation x: 90 degreesToRadians.
	group add: laser.
	
	^ group
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

{ #category : #initializing }
XRHand >> initializeThreeObject [

	| obj |
	obj := self world renderer xr getController: self index.
	obj addEventListener: 'select' do: [:event | self castRay].
	obj add: self createModel.
	^ obj
]

{ #category : #accessing }
XRHand >> raycaster [

	^ raycaster
]

{ #category : #accessing }
XRHand >> raycaster: aRaycaster [

	raycaster := aRaycaster
]
