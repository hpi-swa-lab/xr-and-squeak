Class {
	#name : #XRThreeObject3DMock,
	#superclass : #Object,
	#category : #'SqueakXR-Core-Tests'
}

{ #category : #'as yet unclassified' }
XRThreeObject3DMock >> add: aThreeObject [
]

{ #category : #'as yet unclassified' }
XRThreeObject3DMock >> remove: aThreeObject [
]

{ #category : #'as yet unclassified' }
XRThreeObject3DMock >> userData [

	^ userData ifNil: [userData := Dictionary new]
]
