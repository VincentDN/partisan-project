"""Build a complete stylized head, eyes and ears beneath independently removable mask and cap meshes."""
import bpy, math
import recon_foundation_geometry as geo


def unhood(source, fabric, skin, lips, white, iris, pupil):
    # The generated source has hood trim fused through its eye strip, not a bare face.
    bpy.data.objects.remove(source,do_unlink=True)
    profile=[(1.577,.043,.050),(1.605,.060,.085),(1.635,.075,.108),
             (1.675,.087,.121),(1.725,.087,.106),(1.770,.082,.116),
             (1.800,.067,.087),(1.820,.040,.060),(1.827,.007,.012)]
    verts=[];faces=[];n=24
    for z,width,depth in profile:
        for i in range(n):
            a=i*math.tau/n;verts.append((width*math.sin(a),.020-depth*math.cos(a),z))
    for k in range(len(profile)-1):
        for i in range(n):
            a=k*n+i;b=k*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    faces.extend([tuple(reversed(range(n))),tuple(range((len(profile)-1)*n,len(profile)*n))])
    skull=geo.mesh('SK_CM_Head',verts,faces,skin)
    for polygon in skull.data.polygons:polygon.use_smooth=True
    capverts=[(x*1.035,(y-.02)*1.035+.02,z+.002) for x,y,z in verts]
    capfaces=[f for f in faces if min(verts[i][2] for i in f)>=1.770]
    used=sorted({i for f in capfaces for i in f});mapping={old:i for i,old in enumerate(used)}
    cap=geo.mesh('SK_CM_HeadCap',[capverts[i] for i in used],[tuple(mapping[i] for i in f) for f in capfaces],fabric)
    for polygon in cap.data.polygons:polygon.use_smooth=True
    nose=geo.mesh('SK_CM_Nose',[(-.012,-.077,1.738),(.012,-.077,1.738),(0,-.131,1.693),
                   (-.019,-.091,1.682),(.019,-.091,1.682),(0,-.107,1.676)],
                  [(0,1,2),(0,2,3),(1,4,2),(3,2,5),(2,4,5),(0,3,5,4,1)],skin)
    for polygon in nose.data.polygons:polygon.use_smooth=True
    mouth=geo.mesh('SK_CM_Lips',[(-.024,-.105,1.658),(0,-.115,1.660),(.024,-.105,1.658),
                               (0,-.114,1.654),(0,-.098,1.658)],[(0,3,1),(1,3,2),(0,1,4),(1,2,4),(2,3,4),(3,0,4)],lips)
    ears=[];eyes=[]
    for sign in [-1,1]:
        suffix='L' if sign>0 else 'R';ev=[];ef=[]
        for k in range(7):
            t=math.pi*(k+1)/8
            for i in range(8):
                a=math.tau*i/8
                ev.append((sign*(.084+.014*math.sin(t)*math.cos(a)),.007+.019*math.sin(t)*math.sin(a),1.718+.034*math.cos(t)))
        for k in range(6):
            for i in range(8):
                a=k*8+i;b=k*8+(i+1)%8;ef.append((a,b,b+8,a+8))
        ef.extend([tuple(reversed(range(8))),tuple(range(48,56))])
        ear=geo.mesh('SK_CM_Ear_'+suffix,ev,ef,skin)
        for polygon in ear.data.polygons:polygon.use_smooth=True
        ears.append(ear)
        # Small almond-shaped eyes, with explicit iris/pupil surfaces and a fitted upper brow.
        def disc(name,rx,rz,depth,material,dx=0,dz=0):
            vs=[(sign*.034+dx,depth-.002,1.738+dz)]
            for i in range(12):
                a=i*math.tau/12;vs.append((sign*.034+dx+rx*math.cos(a),depth,1.738+dz+rz*math.sin(a)))
            fs=[(0,i+1,(i+1)%12+1) for i in range(12)]
            obj=geo.mesh('SK_CM_Eye_'+name+'_'+suffix,vs,fs,material)
            for polygon in obj.data.polygons:polygon.use_smooth=True
            return obj
        eyes.extend([disc('White',.019,.008,-.095,white),disc('Iris',.006,.006,-.099,iris),
                     disc('Pupil',.003,.0038,-.102,pupil),disc('Glint',.0013,.0013,-.105,white,dx=-.002,dz=.002)])
        x=sign*.034
        brow=geo.mesh('SK_CM_Eye_Brow_'+suffix,[(x-.020,-.091,1.754),(x,-.101,1.758),(x+.020,-.091,1.754),
                    (x+.020,-.091,1.758),(x,-.101,1.762),(x-.020,-.091,1.758)],[(0,1,4,5),(1,2,3,4)],iris)
        eyes.append(brow)
    mv=[];mf=[]
    for z,width,depth in [(1.592,.059,.067),(1.624,.079,.110),(1.674,.091,.145),(1.706,.089,.152)]:
        for i in range(24):
            a=math.tau*i/24
            mv.append((width*math.sin(a),.010-depth*math.cos(a),z+.008*max(0,math.cos(a)) if z>1.70 else z))
    for k in range(3):
        for i in range(24):
            a=k*24+i;b=k*24+(i+1)%24;mf.append((a,b,b+24,a+24))
    mask=geo.mesh('SK_CM_Mask',mv,mf,fabric)
    for polygon in mask.data.polygons:polygon.use_smooth=True
    return [skull,cap,nose,mouth,mask,*ears,*eyes]
