Class {
	#name : #XRRotatingCube,
	#superclass : #XRObject,
	#category : #'SqueakXR-Misc'
}

{ #category : #'as yet unclassified' }
XRRotatingCube >> initializeThreeObject [

	^ Three Mesh
		new: (Three BoxGeometry
			new: 1m
			height: 1m
			depth: 1m)
		material: (Three MeshLambertMaterial
			new: ({#color -> 16rff0000} as: Dictionary)).
]

{ #category : #'as yet unclassified' }
XRRotatingCube >> step: delta [

	self threeObject rotation y: delta / 1000 + self threeObject rotation y.
	
	ThreadSafeRandom next > 0.95 ifTrue: [self error: 'oops']
]
