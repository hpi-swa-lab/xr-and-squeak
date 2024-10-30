Extension { #name : #Vector3 }

{ #category : #'*SqueakXR-helpers' }
Vector3 >> asJSArgument [

	^ Three Vector3 new: self x y: self y z: self z
]

{ #category : #'*SqueakXR-helpers' }
Vector3 class >> componentSelectors [

	^ #(x y z)
]
